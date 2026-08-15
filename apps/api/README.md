# `@k0ii/api`

Hono HTTP API and PS99 poll worker for the K0ii site. Owns Postgres (Prisma), ingests clan battle data, serves JSON to `apps/web`.

## Run

```bash
# From repo root
bun install
bun run db:generate
bun run db:push

cd apps/api
bun run dev      # HTTP — http://localhost:3002
bun run poll     # ingest loop (separate process)
```

Scripts load `../../.env` automatically. Do not put secrets under `apps/api/`.

## Stack

- Bun + Hono
- Prisma → PostgreSQL (`DATABASE_URL`; Accelerate optional)
- Tracked clan: `CLAN_NAME` (default `K0i2`)
- Live poll: `POLL_INTERVAL_MS` (default **5 min**)
- Idle poll: `POLL_INTERVAL_IDLE_MS` (default **30 min**)

## HTTP routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/api/roster` | Battle strip, neighbors, members |
| GET | `/api/leaderboards` | Clan ladder + related boards |
| GET | `/api/graphs` | Points / rank series (`?hours=1–48`) |
| GET | `/api/battle-archive` | Past battles |
| GET | `/api/battles/:id` | Single battle detail |
| GET | `/api/battle-rewards` | Placement rewards |
| GET | `/api/leagues` | League board (Prisma + PS99 `/v1/leagues` polls) |
| GET | `/api/leagues/tracked` | Tracked leagues only |
| POST | `/api/leagues/tracked` | Add tracked league (`X-Bot-Secret`; pending OK if not on PS99 yet) |
| DELETE | `/api/leagues/tracked/:name` | Remove one tracked league (`X-Bot-Secret`) |
| DELETE | `/api/leagues/tracked` | Clear all tracked leagues (`X-Bot-Secret`) |
| GET | `/api/leagues/settings` | Additions lock status |
| POST | `/api/leagues/settings/additions` | Toggle/set additions lock (`X-Bot-Secret`) |
| GET | `/api/global-leaderboard` | Cross-clan players (`q`, `clan`, `limit`, `offset`) |
| GET | `/api/registry` | Staff registry |

CORS: `WEB_ORIGINS` (comma-separated). Localhost `:3001` always allowed. `*` = reflect any origin (demo only).

Responses for hot routes are cached in-memory (`ROSTER_CACHE_MS`, default = live poll interval).

## Poll job

`src/jobs/scheduler.ts` adaptive loop:

1. Active clan battle from PS99  
2. Own clan roster + member battle points  
3. Battle ladder / neighbors  

**Live:** batched `ClanBattleSnapshot` + changed `PlayerPointSnapshot` rows.  
**Idle:** battle/clan upsert + archive — no snap spam.  
**Rewards:** `PlacementRewards` written once onto `Battle.rewardsJson`.  
**Global index:** while live, every `GLOBAL_INDEX_REFRESH_MS`, fan-out top N clans → upsert `GlobalPlayerIndexSnapshot` (`id=current`). Does not write per-player snaps.  
**Leagues:** every `LEAGUE_POLL_INTERVAL_MS` (default = live poll), top 100 + tracked leagues → `LeagueSnapshot`. Tracked set edited by Discord bot via authenticated write routes.

Each tick logs `ops≈N` and `estimatedMonthlyOps≈N` (Accelerate budget helper).

On Railway, run poll as its own service next to `api`.

## Free-tier budget (≈100k Accelerate ops / month)

| Slice | Ops | Notes |
| --- | --- | --- |
| Monthly cap | 100,000 | Hard |
| Safety buffer | 40,000 | Headroom |
| Usable | 60,000 | |
| Live poll (5 min, ≤6 ops/tick) | ~24k / month | ~14 battle-days |
| Idle poll (30 min) | ~3–8k | Detect next war |
| **Estimate total** | **~30–35k** | Fat headroom |

Design rules: batch writes, windowed clan snaps, skip flat player snaps unless `PLAYER_SNAP_FORCE_MS`, in-memory GET cache, global index in Postgres (not Accelerate-heavy).

## Prisma

Schema: `prisma/schema.prisma`

```bash
bun run db:generate   # client
bun run db:push       # prototype / demo
bun run db:migrate    # migration workflow
```

Uses `DATABASE_URL` (Accelerate in prod) and `DIRECT_DATABASE_URL` (migrations / direct Postgres).

Core models: `Clan`, `Player`, `ClanMembership`, `Battle`, `ClanBattleSnapshot`, `PlayerPointSnapshot`, `BattleArchive`, `GlobalPlayerIndexSnapshot`, `TrackedLeague`, `LeagueSnapshot`.

One-off history import (legacy JSON → Prisma):

```bash
bun run import:bot-history
```

## Folder structure

```
src/
├── index.ts                 Hono entry
├── env.ts                   Zod-validated env + CORS
├── jobs/scheduler.ts        Adaptive poll + global cadence
├── lib/
│   ├── prisma.ts
│   ├── response-cache.ts
│   └── poll-stamp.ts
└── services/
    ├── ps99-client.ts
    ├── poll-ps99.ts
    ├── poll-leagues.ts
    ├── tracked-leagues.ts
    ├── refresh-global-index.ts
    ├── prune-snapshots.ts
    ├── build-roster.ts
    ├── build-leaderboards.ts
    ├── build-graphs.ts
    ├── build-archive.ts
    ├── build-rewards.ts
    ├── build-leagues.ts
    ├── build-global.ts
    ├── build-registry.ts
    ├── stats.ts
    └── comparison.ts
```

## Env

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Prisma connection |
| `DIRECT_DATABASE_URL` | yes\* | — | Direct URL for migrations |
| `BOT_API_SECRET` | for writes | — | Shared secret for `X-Bot-Secret` on league mutate routes |
| `LEAGUE_POLL_INTERVAL_MS` | no | `POLL_INTERVAL_MS` | League ladder poll cadence |
| `CLAN_NAME` | no | `K0i2` | Clan to track |
| `API_PORT` | no | `3002` | Local listen port |
| `PORT` | no | — | Host-injected; preferred over `API_PORT` |
| `WEB_ORIGINS` | no | localhost | CORS allowlist (`*` = allow all) |
| `POLL_INTERVAL_MS` | no | `300000` | Live poll (5 min) |
| `POLL_INTERVAL_IDLE_MS` | no | `1800000` | Idle poll (30 min) |
| `ROSTER_CACHE_MS` | no | `300000` | GET cache TTL |
| `CLAN_SNAPSHOT_WINDOW` | no | `10` | Rank window each tick |
| `CLAN_LADDER_FULL_EVERY` | no | `6` | Full top-50 every N live ticks |
| `PLAYER_SNAP_FORCE_MS` | no | `900000` | Force flat player snap (15 min) |
| `GLOBAL_INDEX_CLAN_LIMIT` | no | `500` | Clans in global index |
| `GLOBAL_INDEX_REFRESH_MS` | no | `1800000` | Global refresh while live |
| `GLOBAL_INDEX_FETCH_CONCURRENCY` | no | `6` | Parallel clan fetches |

\*Required when using Accelerate.

## PS99 notes

- Own clan points: legacy `/api/clan/{name}` (member contributions)
- Neighbor ranks: v1 battle `topClans`
- Global index: `/api/clans` + fan-out `/api/clan/{name}` — watch **100 req/min** PS99 limit
- 5 min live poll + few calls/tick stays safe; global refresh spreads fetches over ~1–2 min
