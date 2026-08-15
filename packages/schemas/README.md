# `@k0ii/schemas`

Shared Zod schemas for API payloads consumed by `apps/web` and produced by `apps/api`.

```ts
import { /* schemas */ } from "@k0ii/schemas";
```

## Modules

| File | Covers |
| --- | --- |
| `roster.ts` | Roster / members / battle strip |
| `leaderboards.ts` | Clan ladder boards |
| `graphs.ts` | Time-series points / rank |
| `battle.ts` | Battle archive shapes |
| `rewards.ts` | Placement rewards |
| `leagues.ts` | Leagues board + tracked mutate bodies |
| `global.ts` | Global player index |
| `registry.ts` | Staff registry |
| `prize-pool.ts` | Prize pool helpers |
| `index.ts` | Re-exports |

Keep API response builders and frontend parsers on the same schemas so contract drift fails loudly at the boundary.
