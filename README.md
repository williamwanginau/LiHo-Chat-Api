# LiHo-Chat-Api

API for LiHo Chat (NestJS + Prisma). Provides health checks, auth, and chat endpoints.

## Status
- Health: `/livez` (200), `/readyz` (200/503), `/health` `/healthz` → readiness alias
- Prisma: initial migration in `prisma/migrations/**`
- Users: enhanced fields (avatarUrl, bio, emailVerifiedAt, disabled, lastLoginAt)
- Auth (Phase 2): register/login/me with JWT (access 15m)

## Run Locally
- Dev: `npm run dev`
- Build: `npm run build`
- Prisma: `npx prisma generate` · `npx prisma migrate dev` · `npm run prisma:deploy`
- Local CI (mimic GitHub Actions): `npm run ci:local`

## Environment
- Required: `DATABASE_URL`, `JWT_SECRET` (min length 10), `NODE_ENV`
- Optional: `PORT`, `CORS_ORIGINS` (comma‑separated), `SEED_ALLOW_PROD`, `JWT_EXPIRES_SEC` (default 900), `PRISMA_CONNECT_ON_BOOT` (default true)

## Endpoints (auth)
- `POST /auth/register` — { email, name, password } → 201 User (no passwordHash)
- `POST /auth/login` — { email, password } → 200 { accessToken, tokenType: Bearer, expiresIn } (password length ≥ 8)
- `GET /auth/me` — Bearer token → 200 User; if JWT is invalid or the user does not exist → 401

## Health
- Liveness: `GET /livez`
- Readiness: `GET /readyz`

### Quick test (curl)

```bash
API=https://<your-api-host>
curl -s -X POST "$API/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"alice@example.com","password":"demopass123"}'

TOKEN=<paste accessToken>
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
```

## Deploy (Render)
- Health Check Path: `/livez`
- Build: `npm ci && npm run prisma:generate && npm run build`
- Start: `npm run prisma:deploy && npm run start:prod`
- See `render.yaml` for env list

## CORS

- In development/test: when `CORS_ORIGINS` is empty, defaults allow local origins (`localhost`, `127.0.0.1`).
- In production: when `CORS_ORIGINS` is empty, no cross‑origin requests are allowed by default.
- Set `CORS_ORIGINS` to a comma‑separated allowlist (e.g., `https://app.example.com,https://www.example.com`).
