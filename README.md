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
- Required: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`
- Optional: `PORT`, `CORS_ORIGINS` (comma‑separated), `SEED_ALLOW_PROD`

## Endpoints (auth)
- `POST /auth/register` — { email, name, password } → 201 User (no passwordHash)
- `POST /auth/login` — { email, password } → 200 { accessToken, tokenType: Bearer, expiresIn }
- `GET /auth/me` — Bearer token → 200 User

## Health
- Liveness: `GET /livez`
- Readiness: `GET /readyz`

## Deploy (Render)
- Health Check Path: `/livez`
- Build: `npm ci && npm run prisma:generate && npm run build`
- Start: `npm run prisma:deploy && npm run start:prod`
- See `render.yaml` for env list
