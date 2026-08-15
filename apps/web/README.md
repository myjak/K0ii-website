# `@k0ii/web`

Next.js 16 frontend for the K0ii clan dashboard. Pond-themed UI over live war data from `@k0ii/api`.

## Run

```bash
# From repo root
cp .env.example .env   # if needed
bun install

cd apps/web
bun run dev            # http://localhost:3001
```

Needs the API up at `NEXT_PUBLIC_API_URL` (default `http://localhost:3002`), plus the poll job if you want fresh battle data.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 — pond tokens in `src/app/globals.css`
- `@k0ii/schemas` for response validation
- TanStack Query + Table, nuqs, next-themes (day/night pond)
- Base UI primitives under `src/components/ui/`

Design system: [`../../designGuide.md`](../../designGuide.md).

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home / destinations |
| `/roster` | War hub (roster, race, graphs, coverage) |
| `/history` | Battle archive hub |
| `/battle-rewards` | Placement payouts |
| `/leagues` | Leagues board (tracked = ours; top 100 ladder) |
| `/global` | Cross-clan leaderboard |
| `/community` | Community + join + registry |
| `/privacy`, `/terms` | Legal |

Legacy path aliases (`/race`, `/graphs`, `/coverage`, `/registry`, `/join`, …) still exist where hubs deep-link them.

## Data flow

All live war data comes from **our API**, never PS99 in the browser.

- Client helpers: `src/lib/api/client.ts`, `src/lib/api/config.ts`
- Same-origin proxy (Railway / prod): `src/app/api/[...path]/route.ts` → `API_UPSTREAM_URL` when `NEXT_PUBLIC_API_SAME_ORIGIN=1`

## Folder structure

```
src/
├── app/                    App Router pages + proxy route
├── components/
│   ├── layout/             Shell, nav, footer, theme
│   ├── home/               Landing
│   ├── roster/             War table, member dialog, analytics
│   ├── war/                Race / graphs / coverage panels
│   ├── history/            Archive, replay, reports
│   ├── community/          Join + registry
│   ├── charts/             Shared chart chrome
│   └── ui/                 Buttons, dialog, inputs
└── lib/
    ├── api/                fetch helpers + config
    ├── analytics/          Projection / rank forecast
    └── format.ts           Points, PPH, duration
```

## Env

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | Direct API base (local / SSR fallback) |
| `API_UPSTREAM_URL` | — | Runtime proxy target for `/api/*` |
| `NEXT_PUBLIC_API_SAME_ORIGIN` | — | Set `1` so browser uses same-origin proxy |

Copy from repo-root [`.env.example`](../../.env.example).
