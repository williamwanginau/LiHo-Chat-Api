# TODO

Track the plan and progress for the chat server. Check off as you go.

## Foundation

- [x] Decide module format (CommonJS vs ESM); keep consistent
- [x] Initialize NestJS project skeleton (`src/`, `tests/`, `scripts/`, `assets/`)
- [x] Add `ConfigModule` and load `.env` (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`)
- [x] Enable global `ValidationPipe` and `ClassSerializerInterceptor`
- [x] Add CORS allowlist and Helmet for REST (CORS_ORIGINS env supported)
- [x] Implement `HealthController` (`/healthz`) with DB check (plus `/livez`, `/readyz`)

## Database & Prisma

- [x] Define Prisma schema for `User`, `Room`, `Membership`, `Message`
- [x] Add indices: `Message(roomId, createdAt, id)`; unique `(Membership.userId, roomId)`
- [x] Configure sensible FKs and delete rules (cascade memberships/messages)
- [x] Add `PrismaService` with shutdown hooks
- [x] Create initial migration (`prisma migrate dev --name init`)
- [x] Seed script with demo users/rooms/messages (bcrypt hashes; prod-guard)

## Auth

- [ ] Register: bcrypt hash password, store user
- [ ] Login: issue access (15m) + refresh (7d) tokens
- [ ] Refresh: rotate refresh token; store hashed refresh tokens in DB
- [ ] Logout/Revocation: invalidate refresh token(s)
- [ ] `JwtAuthGuard` for REST
- [ ] `WsJwtGuard` for Socket.IO handshake

## Rooms & Messages (REST)

- [ ] `GET /rooms` list rooms
- [ ] `POST /rooms` create room (auth required; private needs authorization)
- [ ] `GET /rooms/:id/messages` cursor pagination `(createdAt,id)`
- [ ] Validate membership for room‑scoped routes
- [ ] DTOs + validation for all endpoints

## Realtime (Socket.IO)

- [ ] Gateway namespace and event contracts
- [ ] `join_room`, `leave_room`, `send_message`, `typing` handlers
- [ ] Persist messages on `send_message`, then broadcast
- [ ] Presence map `roomId -> Set<userId>`; update on join/leave/disconnect
- [ ] Typing TTL map `(roomId,userId)` with debounce/throttle and expiry
- [ ] Acks and error payloads for clients

## Observability & Security

- [ ] Structured logging (timestamp, reqId, userId, event, latency)
- [ ] Rate limit REST (`@nestjs/throttler`) and WS events (custom)
- [ ] Input size limits; sanitize message content
- [ ] Error handling: safe messages, avoid leaking internals

## Frontend (Prototype - Next.js + TypeScript)

- [x] Scaffold Next.js 14 (App Router, TS) project
- [x] Define env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- [ ] Implement auth pages (`/login`) and protected routes
- [ ] Pages: `/rooms` (list), `/rooms/[id]` (thread)
- [ ] Socket provider (`use client`) with `socket.io-client` and reconnection
- [ ] React Query for REST data + cache hydration
- [ ] Typing indicator and presence display
- [ ] Infinite scroll for message history (cursor pagination)

- [x] Proxy REST via Next rewrites (`/api/*` → `NEXT_PUBLIC_API_URL`) for dev/prod consistency
- [x] Enhance `/health` page: dark UI cards, status dots, refresh, expandable details; test `/api/livez` & `/api/readyz`
- [x] DX: add `.nvmrc` (Node 18.18.0), `.env.local.example`, and tidy `.gitignore`

## Docker & Local Dev

- [ ] Multi‑stage Dockerfile (Node 18 Alpine)
- [ ] docker‑compose with `api` and `db` services
- [ ] Local run docs and Makefile targets (`dev`, `build`, `test`, `lint`)

## Deployment

- [x] Provision Neon Postgres; ensure SSL (`sslmode=require`)
- [x] Render Web Service: build, start, env vars, health check (`/livez`)
- [ ] Vercel/Netlify frontend: set API URL, verify CORS and `wss://.../socket.io`
- [x] Migration deploy hook (`prisma migrate deploy` before start)

- [x] Render blueprint (`api/render.yaml`): health `/livez`, build/start commands, env var list
- [x] Vercel auto-deploy connected for Web (Production on `main`, Preview on PR)

## CI/CD & Quality

- [ ] GitHub Actions: `npm ci` → `lint` → `test` (coverage ≥ 85%)
- [ ] Optional: auto‑deploy to Render on `main` push
- [ ] E2E tests: register → login → create room → send message → fetch history
- [ ] Load smoke test (k6/Autocannon)

- [x] GitHub Actions build pipelines:
  - API: Node 18, `npm ci`, `prisma generate`, `build`
  - Web: Node 18, `npm ci`, `tsc --noEmit`, `build` (lockfile + caching enabled)

- [ ] Require checks on `main` (branch protection: API Build, Web Build, Vercel)
- [ ] Cache Next.js build artifacts (`.next/cache`) for faster CI
- [ ] Add unit/e2e tests and enforce coverage threshold (≥ 85%)
- [ ] Add workflow concurrency (cancel in-progress on new pushes)

## Nice‑to‑Have / Future Work

- [ ] Private rooms/invites and role management
- [ ] Direct messages
- [ ] Full‑text search (e.g., Postgres trigram/tsvector)
- [ ] Image upload (signed URLs, size/type validation)
- [ ] Notifications (web push or email)
- [ ] Redis presence + Socket.IO Redis adapter for multi‑instance
- [ ] Read receipts and per‑room read cursor
- [ ] Swagger `/docs` with auth support
