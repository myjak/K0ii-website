# `@k0ii/bot`

Discord front-end for K0ii. Bun + TypeScript + small in-house command kit.

## Hard rule: API only

Same boundary as `apps/web`:

- **Allowed:** Discord.js, HTTP to `apps/api`, `@k0ii/schemas`
- **Forbidden:** PS99, Roblox APIs, Prisma/DB, Bloxlink, scraping

New bot features → add routes in `apps/api` (+ schemas) first → extend `src/api/client.ts` → slash command via `ctx.api`.

## Setup

1. Create a Discord application + bot at https://discord.com/developers/applications
2. Enable no privileged intents required for v1 (Guilds only)
3. Invite bot with `applications.commands` scope
4. Root `.env`:

```bash
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=          # recommended while developing (instant command sync)
API_BASE_URL=http://localhost:3002
BOT_API_SECRET=            # same as apps/api — required for league writes
# LEAGUE_CHANNEL_ID=       # optional default; override via /league channel set
```

```bash
bun install                 # from monorepo root
cd apps/api && bun run dev  # HTTP
cd apps/api && bun run poll # war + independent leagues poll
cd apps/bot && bun run dev
```

## Commands

| Command | Needs API | What |
| --- | --- | --- |
| `/ping` | no | Bot + WS latency |
| `/help` | no | Lists loaded slash commands |
| `/status` | yes | Clan war snapshot via `GET /api/roster` |
| `/player` | yes | CW-style card: stats + 24h PPH chart |
| `/league create` | yes + secret | Discord team (owner + ≤3) |
| `/league add` / `remove` / `disband` | yes + secret | Discord roster (owner) |
| `/league view` | yes | Discord teams only |
| `/league track` / `untrack` | yes + secret | Pin PS99 name for website |
| `/league list` | yes | Pinned list + add lock |
| `/league toggle-add` | yes + secret | Lock create/track |
| `/league clear` | yes + secret | Clear pinned PS99 names |
| `/league clearall` | yes + secret | Wipe Discord teams |
| `/league channel set` / `view` | yes + secret | League channel + summary embed |

Standings = website `/leagues` (`GET /api/leagues`). Auto-tracks PS99 names starting with `k0i` / `koi` (excludes `k0ii7`).

## Kit layout

```
src/
  kit/           load commands/events/middleware, register, router
  api/           HTTP client → apps/api only
  commands/      slash command modules
  events/        Discord event modules (ready, …)
  middleware/    before/after hooks
```

`ctx` always includes `{ interaction, client, api, commands }`.
