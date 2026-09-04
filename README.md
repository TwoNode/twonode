# Twonodes

Three products, one Next.js app: **REVA** (property due-diligence requests), **Surfboard** (survey plan lodging and MDA approval workflow), and **GBC** (event ticketing). Product code is colocated under `reva/`, `surfboard/`, `gbc/`; `app/` is the routing shell (pages + `/api/v1/*` route handlers only).

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (or whichever port you passed via `-p`) to see the result. `app/page.tsx` is the marketing homepage.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to load its fonts.

## Documentation

Everything about how the app is built and why lives in [`docs/`](docs/README.md):

- [`docs/development-history/`](docs/development-history/) — the architecture rebuild: why it happened, the phase-by-phase plan, and what actually shipped in each phase. Start here for the most current picture of the codebase.
- [`docs/auth/`](docs/auth/) — how login, sessions, and roles work across all three products (native email+password auth and the still-live Kinde OAuth path).
- [`docs/payment/`](docs/payment/) — Paystack subscriptions, Certificate of Deposit payments, and the Remita two-link verification flow.
- [`docs/surfboard/`](docs/surfboard/), [`docs/reva/`](docs/reva/), [`docs/gbc/`](docs/gbc/) — per-product user flows, user stories, and feature notes.

## Learn More (Next.js)

- [Next.js Documentation](https://nextjs.org/docs) — features and API.
- [Learn Next.js](https://nextjs.org/learn) — an interactive tutorial.
- [Next.js GitHub repository](https://github.com/vercel/next.js/)

## Deploy

The easiest way to deploy a Next.js app is [Vercel](https://vercel.com/new), from the creators of Next.js — see the [deployment documentation](https://nextjs.org/docs/deployment) for details.
