# Wandrly — web app

A collaborative canvas for planning a trip. A trip is days; a day is an ordered set of typed
blocks; and **variants** — parallel itineraries you fork, explore and promote — mean exploring an
alternative is never a destructive edit.

This is the frontend. The API lives in [`wandrly-backend`](https://github.com/Prathameshp98/wandrly-backend).

## Specification

This app is built to a written spec, not to taste. Read these before changing anything structural:

| Document | Covers |
| --- | --- |
| `PRD.md` | What to build — requirements, roles, limits, copy voice |
| `API_CONTRACT.md` | What the server offers — authoritative over the backend design doc |
| `FRONTEND_TECHNICAL_DESIGN.md` | How this app is built — stack, routes, data flow |
| `WANDRLY 2/` | **The design.** A runnable prototype, not a mockup |

> `WANDRLY 2/` is the design specification, and the frontend must be a complete visual replica of
> it. Where the PRD and the prototype disagree on a visual detail, the prototype wins — except for
> the `PRD §9.6` accessibility corrections.

The prototype has no build step. Open `WANDRLY 2/Your Journeys.html` in a browser and keep it beside
`npm run dev` while working on any surface.

## Getting started

```bash
cp .env.example .env.local   # then fill in the blanks
npm install
npm run dev                  # http://localhost:3000
```

### Pointing at an API

`NEXT_PUBLIC_API_BASE_URL` switches between backends.

**Local** — the fastest loop, and it needs no secrets. In `wandrly-backend`:

```bash
npm run db:reset             # migrate + seed the Kyoto fixture set
npm run dev                  # :8000
npm run token:dev            # a 12h HS256 token, paste into NEXT_PUBLIC_DEV_ACCESS_TOKEN
```

Its `.env` must list `http://localhost:3000` in `CORS_ORIGINS`.

**Deployed** — Koyeb, Frankfurt. Blocked until `CORS_ORIGINS` on that service includes
`http://localhost:3000`; until then preflight returns no `access-control-allow-origin` and every
request fails in the browser.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | `typecheck` + `lint` + `test` — run before every commit |
| `npm test` | Unit and component tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run api:types` | Regenerate `src/lib/api/schema.d.ts` from the backend's `openapi.json` |

## Conventions that are not negotiable

These encode hard requirements; breaking one is a defect, not a style choice.

- **The canvas is one cache entry.** `GET /v1/trips/{tripId}/canvas` returns the whole day/block
  tree. Fetch once per variant and mutate the cached tree locally.
- **Every mutation is optimistic with rollback.** No round-trip sits in the interaction path.
- **No edit is ever silently lost.** Never swallow an `ApiError`. Never auto-retry
  `409 CONFLICT_STALE` — that is a real conflict needing a human decision.
- **Money never touches `Number`.** Amounts are decimal strings in minor units. All conversion lives
  in `src/lib/money.ts`. `/100` is wrong for JPY (0 decimals) and BHD (3). ESLint enforces this.
- **Never recompute server-authoritative values** — `readinessPct`, `daysToGo`, counts, balances.
- **Every drag has a keyboard path.** Build the menu command first; the drag calls the same mutation.
