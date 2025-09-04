# LiHo Web (Next.js + TypeScript)

Minimal Next.js 14 skeleton to connect with LiHo API.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — run production server
- `npm run lint` — Next lint

## Env

Copy `.env.local.example` to `.env.local` and set:
- `NEXT_PUBLIC_API_URL` — e.g. `https://<render-app>.onrender.com`
- `NEXT_PUBLIC_WS_URL` — e.g. `wss://<render-app>.onrender.com/socket.io`

## Verify

Open `/health` to fetch backend `/healthz` and display the result.

## Deploy (Vercel)

- Import this repo into Vercel
- Set the two env vars for Production & Preview
- Deploy and visit `/health`

