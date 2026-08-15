# K0ii Website

Clan war dashboard for **K0ii** (tracked clan: `K0i2`). Live roster, battle history, leaderboards, rewards, leagues, and community pages — fed by a Hono API that polls the [PS99 Public API](https://github.com/BIG-Games-LLC/ps99-public-api-docs).

**Stack:** Bun · Turborepo · Next.js 16 (`apps/web`) · Hono + Prisma (`apps/api`) · Discord bot (`apps/bot`) · shared Zod (`packages/schemas`)

**Design:** [`designGuide.md`](./designGuide.md) — cartoon koi pond UI.

## Layout

```
k0ii-website/
├── apps/web/          Next.js frontend (:3001)
├── apps/api/          Hono API + PS99 poll job (:3002)
├── apps/bot/          Discord bot (commands → API only)
├── packages/schemas/  Shared Zod response types
├── designGuide.md
└── .env.example
```

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- PostgreSQL (local, Prisma Postgres, or Accelerate)
- Discord bot token (only if running `apps/bot`)

## Setup

```bash
cp .env.example .env   # edit DATABASE_URL / DIRECT_DATABASE_URL (+ Discord vars for bot)
bun install
bun run db:generate
bun run db:push        # or: bun run db:migrate
```

Env lives at the **repo root** (`.env`), not inside `apps/api/` or `apps/bot/`.

## Run locally

```bash
# Terminal 1 — API
cd apps/api && bun run dev

# Terminal 2 — PS99 poll (required for live data)
cd apps/api && bun run poll

# Terminal 3 — Web
cd apps/web && bun run dev

# Terminal 4 — Discord bot (optional)
cd apps/bot && bun run dev
```

Or from root:

```bash
bun run dev            # web + api via turbo
# Poll still separate: cd apps/api && bun run poll
# Bot still separate:  cd apps/bot && bun run dev
```

Open [http://localhost:3001](http://localhost:3001) (home) or [http://localhost:3001/roster](http://localhost:3001/roster) (war hub).

**Data boundary:** `apps/web` and `apps/bot` never call PS99. Both go through `apps/api`. New bot features = new API routes first.

## What the site covers

| Area      | Routes                                     | Data                                          |
| --------- | ------------------------------------------ | --------------------------------------------- |
| War hub   | `/roster`, race / graphs / coverage panels | `GET /api/roster`, graphs, leaderboards       |
| History   | `/history`, replay, reports                | `GET /api/battle-archive`, `/api/battles/:id` |
| Rewards   | `/battle-rewards`                          | `GET /api/battle-rewards`                     |
| Leagues   | `/leagues`                                 | `GET /api/leagues` (tracked via bot `/league add`) |
| Global    | `/global`                                  | `GET /api/global-leaderboard`                 |
| Community | `/community`, join, registry               | `GET /api/registry` + static join copy        |

Frontend never calls PS99 directly — only `apps/api`.

## Railway (demo)

One project, three services from the same repo:

| Service | Start                          | Notes                                                       |
| ------- | ------------------------------ | ----------------------------------------------------------- |
| `web`   | `cd apps/web && bun run start` | Build: `bun install && bunx turbo build --filter=@k0ii/web` |
| `api`   | `cd apps/api && bun run start` | Build: `bun install && bun run db:generate`                 |
| `poll`  | `cd apps/api && bun run poll`  | Same build as api; no public domain                         |

**Shared env:** `DATABASE_URL`, `DIRECT_DATABASE_URL`, `CLAN_NAME=K0i2`, poll knobs from `.env.example`.

**Wire web → api:**

1. Deploy api → copy public URL
2. Web: `API_UPSTREAM_URL=https://YOUR-API…` + `NEXT_PUBLIC_API_SAME_ORIGIN=1`
3. Api: `WEB_ORIGINS=https://YOUR-WEB…` (or `*` for demo)

Browser hits `/api/*` on the web origin; `apps/web/src/app/api/[...path]/route.ts` proxies to the api service.

## Docs

| Doc                                                                    | What                               |
| ---------------------------------------------------------------------- | ---------------------------------- |
| [`apps/web/README.md`](./apps/web/README.md)                           | Frontend pages, env, structure     |
| [`apps/api/README.md`](./apps/api/README.md)                           | HTTP routes, poll job, Prisma, env |
| [`apps/bot/README.md`](./apps/bot/README.md)                           | Discord bot kit, API-only rule     |
| [`packages/schemas/README.md`](./packages/schemas/README.md)           | Shared Zod packages                |
| [PS99 API docs](https://github.com/BIG-Games-LLC/ps99-public-api-docs) | Upstream game API                  |

Env reference: [`.env.example`](./.env.example).
