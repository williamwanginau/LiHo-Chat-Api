# Chat Server Blueprint

This document captures the high‑level plan, architecture, and operational practices for a portfolio‑grade real‑time chat application.

## 1) Goals & Scope

- Publicly accessible URL, smooth UX, clean codebase.
- MVP features: register/login, public room, message persistence, online/offline, typing, infinite scroll.
- Extensibility: private rooms/invites, DMs, full‑text search, image upload, notifications, Redis presence.

## 2) Architecture Overview

- API surface: HTTP (auth/rooms/history) + WebSocket (messages, typing, presence) using Socket.IO.
- DB entities: User, Room, Membership, Message.
- State: single instance phase keeps presence/typing in memory; introduce Redis later for horizontal scale.
- Deployment: client (Vercel static) → API (Render) → Postgres (Neon). All behind HTTPS.

## 3) Tech Stack

- Backend: TypeScript + NestJS (REST + Socket.IO gateway).
- Frontend: Next.js 14 + TypeScript (App Router, React Server Components where suitable; client components for sockets/UI state).
- Database: PostgreSQL (Neon Free to start; later Render/Railway if needed).
- ORM: Prisma (migrate + schema‑first developer experience).
- Auth: JWT access (short‑lived ~15m) + refresh (long‑lived ~7d) with rotation.
- Realtime: Socket.IO; add Redis adapter when multi‑instance.
- Observability: structured logging, /healthz, platform health checks.
- Hosting: API on Render, DB on Neon, frontend on Vercel/Netlify.

## 4) Data Model (draft)

- User: `id`, `email` (unique), `name`, `passwordHash`, `createdAt`, `updatedAt`.
- Room: `id`, `name`, `isPrivate`, `createdAt`, `updatedAt`.
- Membership: `userId`, `roomId`, `role`, `createdAt` (unique composite on `(userId, roomId)`), `updatedAt`.
- Message: `id`, `roomId`, `userId`, `content`, `createdAt`, `readAt`, `updatedAt`.

Indexes and constraints:
- Message: composite index `(roomId, createdAt DESC, id DESC)` for cursor pagination.
- Membership: unique `(userId, roomId)`; optional index on `(roomId)` for room member queries.
- Foreign keys with sensible `ON DELETE` rules (e.g., cascade memberships; consider soft‑delete for rooms/messages).

## 5) API Design

REST endpoints:
- `POST /auth/register` — Create user (hash with bcrypt). Enforce rate limit.
- `POST /auth/login` — Issue access + refresh tokens.
- `POST /auth/refresh` — Rotate refresh token, issue new tokens; allow revocation.
- `GET /me` — Return profile of current user.
- `GET /rooms` — List rooms (filtering for visibility if private rooms exist).
- `POST /rooms` — Create room (auth required; authorization for private rooms).
- `GET /rooms/:id/messages?cursor=...&limit=...` — Cursor‑based pagination, newest first or oldest first (consistent order across API/UI). Recommended cursor is a tuple `(createdAt, id)` encoded.
- `GET /healthz` — Returns app + DB status.

Example messages pagination response (oldest‑first for infinite scroll):
```json
{
  "items": [
    { "id": "m1", "userId": "u1", "content": "Hi", "createdAt": "2024-01-01T12:00:00Z" }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDEyOjAwOjAwWiIsImlkIjoibTEifQ=="
}
```

WebSocket (Socket.IO) events:
- Client → Server:
  - `join_room` — `{ roomId }`
  - `leave_room` — `{ roomId }`
  - `send_message` — `{ roomId, content }`
  - `typing` — `{ roomId, isTyping }`
- Server → Client:
  - `message` — `{ id, roomId, userId, content, createdAt }`
  - `typing` — `{ roomId, userId, isTyping }`
  - `presence` — `{ roomId, users: string[] }` or incremental `{ roomId, userId, state }`
  - `room_joined` / `room_left` — ack/notifications
  - `error` — `{ code, message }`

Authorization:
- All WS connections must handshake with `Authorization: Bearer <access_token>`.
- Server validates membership before `join_room`/`send_message`.

## 6) Authentication

- Password hashing: bcrypt with reasonable cost.
- Access token: short lifetime (~15m), stateless JWT with user id; stored in memory on the client.
- Refresh token: long lifetime (~7d), rotate on use. Store hashed refresh tokens in DB to allow revocation and logout. Consider device‑level tracking for multi‑device sessions.
- Guards: `JwtAuthGuard` for REST; custom `WsJwtGuard` to validate the handshake and attach `user` to socket context.

## 7) Realtime Implementation

- Socket.IO gateway in NestJS with namespaced events.
- Presence: in single‑instance phase, keep a Map of `roomId -> Set<userId>`; update on join/leave/disconnect; broadcast presence snapshots or diffs.
- Typing: in‑memory Map with TTL per `(roomId, userId)`; server emits `typing` updates throttled/debounced.
- Reconnect: rely on Socket.IO defaults; on reconnect, revalidate tokens, rejoin rooms, and rebuild presence.
- Horizontal scale: introduce Redis adapter; migrate presence/typing to Redis keys with TTL, e.g., `room:{id}:presence`.

## 8) Pagination & Ordering

- Use cursor pagination to avoid `skip/offset` pitfalls. Cursor encodes `(createdAt, id)` to ensure strict ordering.
- Decide UI order (usually oldest‑first when scrolling up); keep API consistent.
- Include `limit` bounds (e.g., 20–100) and validate.

## 9) Observability & Security

- Logging: structured logger (e.g., Nest Logger with consistent fields: `timestamp, reqId, userId, event, latency`).
- Rate limiting: `@nestjs/throttler` for REST; custom throttling for WS events (typing and messaging).
- CORS: explicit allowlist; handle credentials policy if needed.
- Helmet: standard security headers for REST routes.
- Input validation: `ValidationPipe` with class‑validator; sanitize message content (length limit, optional HTML sanitization).
- Serialization: global `ClassSerializerInterceptor` to hide sensitive fields.
- Errors: return generic messages; avoid leaking internals.

Health checks:
- `/healthz` returns app status and DB connectivity (e.g., simple Prisma query or Nest Terminus integration).

## 10) Local Dev & Docker

- Dev: Node 18+, npm/pnpm. Run Nest dev server; Prisma migrate dev. Frontend uses Next.js dev server.
- Dockerfile: multi‑stage (build on Node 18, prune dev deps, run `node dist/main.js`).
- docker‑compose: services `api` (optional code mount with hot reload) and `db` (`postgres:15`).
- Example DB URL: `postgresql://postgres:postgres@db:5432/app?schema=public`.

## 11) Deployment (Render + Neon + Vercel)

- Neon: create project, obtain connection string (ensure SSL/`sslmode=require`).
- Backend (Render):
  - Build: `npm ci && npm run build && npx prisma generate`.
  - Start: `node dist/main.js` (or `npm run start:prod`).
  - Env: `DATABASE_URL`, `JWT_SECRET`, `PORT=10000` (Render injects actual port), `NODE_ENV`.
  - Health check path: `/healthz`.
  - Region: Singapore or Tokyo for Asian latency.
- Frontend (Vercel): set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to Render domain; verify CORS and WS (`wss://<render-app>.onrender.com/socket.io`).

## 12) CI/CD

- GitHub Actions: on push → `npm ci` → `lint` → `test`.
- Deployment: either Render auto‑deploy or workflow triggers.
- Migrations: run `prisma migrate deploy` just before app start or as a pre‑start step.

## 13) Environment Variables

- `DATABASE_URL`: Postgres connection (Neon/Render/Railway). Include SSL params when required.
- `JWT_SECRET`: strong random string.
- `PORT`: server port (Render will set one; respect `process.env.PORT`).
- `NODE_ENV`: `production` / `development`.
- `REDIS_URL` (optional): for future horizontal scaling (presence/typing, Socket.IO adapter).
Frontend (Next.js):
- `NEXT_PUBLIC_API_URL`: base URL for REST.
- `NEXT_PUBLIC_WS_URL`: WebSocket endpoint (e.g., `wss://<api-domain>/socket.io`).

## 19) Frontend (Next.js)

- Routing: App Router with segments: `/login`, `/rooms`, `/rooms/[id]`.
- Data fetching: server components or route handlers for initial page data; hydrate with client components using React Query for ongoing REST calls.
- Realtime: `socket.io-client` initialized in a client‑only provider (`use client`), scoped per room or globally with context.
- Auth: prefer HTTP‑only cookies if SSR of protected pages is desired; alternatively, client‑side token storage for simplicity (no SSR of protected content).
- State: minimal global state; rely on React Query cache + socket events.

## 14) Testing & Quality

- Unit: auth, guards, service layer (mock Prisma).
- E2E: happy path (register → login → create room → send message → fetch history) and authorization edge cases.
- Coverage target: ≥ 85%.
- Load: quick smoke via k6/Autocannon to estimate throughput/latency for messaging.

## 15) Demo & Seed

- Seeds: `npm run seed` to create demo accounts, rooms, and example messages.
- Demo script:
  - Login with two browsers as different users.
  - Join the same room; show typing, presence, message syncing.
  - Reload to show persisted history and infinite scroll.
  - Simulate disconnect/reconnect and observe stability.

## 16) Timeline (suggested cadence)

- Day 0–1: project skeleton, Prisma, auth, `/healthz`.
- Day 2: rooms/messages REST + basic Socket.IO events.
- Day 3: frontend prototype (public room) + infinite scroll.
- Day 4: deploy (Render/Neon/Vercel) + fix env issues.
- Day 5: observability, rate limiting, error handling + README.
- Day 6–7: private rooms/DMs (optional), E2E, record demo video.

## 17) Risks & Mitigations

- Cold starts: upgrade to non‑sleeping plans; add “first‑load” hint on the frontend.
- WS disconnects: rely on auto‑reconnect, heartbeats; pair with health checks/logging.
- CORS/proxy: explicit allowlist; ensure HTTPS and WS upgrade on Render; test from frontend domain.
- Scaling: after single‑instance parity, add Redis adapter and move presence/typing to Redis.
- Payload size: enforce message length; defer images until later.
- Module format: choose CJS vs ESM early; keep consistent (Nest+TS default CJS is simplest).

## 18) Open Design Decisions

- Room deletion semantics (hard vs soft delete).
- Read receipts granularity (`readAt` per message vs per room cursor).
- Message ordering in UI (oldest‑first vs newest‑first) and matching API defaults.
