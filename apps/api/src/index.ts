import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  AddTrackedLeagueBodySchema,
  CreateDiscordLeagueBodySchema,
  DiscordMemberBodySchema,
  SetLeagueAdditionsBodySchema,
  SetLeagueChannelBodySchema,
} from "@k0ii/schemas";
import type { Env } from "./env";
import { loadEnv } from "./env";
import { requireBotSecret } from "./lib/bot-auth";
import { cachedJson, invalidateResponseCache } from "./lib/response-cache";
import {
  buildBattleArchiveResponse,
  buildBattleDetail,
} from "./services/build-archive";
import { buildGlobalLeaderboardResponse } from "./services/build-global";
import { buildGraphsResponse } from "./services/build-graphs";
import { buildLeaderboardsResponse } from "./services/build-leaderboards";
import {
  buildLeagueDetail,
  buildLeaguesResponse,
  listTrackedLeagues,
} from "./services/build-leagues";
import { buildBattleRewardsResponse } from "./services/build-rewards";
import { buildRegistryResponse } from "./services/build-registry";
import { buildRosterResponse } from "./services/build-roster";
import {
  addDiscordMember,
  clearAllDiscordLeagues,
  createDiscordLeague,
  disbandDiscordLeague,
  listDiscordLeagues,
  removeDiscordMember,
  setLeagueChannel,
  setSummaryMessageId,
} from "./services/discord-leagues";
import {
  addTrackedLeague,
  clearTrackedLeagues,
  getLeagueSettings,
  removeTrackedLeague,
  setAdditionsOpen,
} from "./services/tracked-leagues";

export function createApp(env: Env) {
  const app = new Hono();
  const cacheMs = env.ROSTER_CACHE_MS;
  const allowed = new Set(env.corsOrigins.map((o) => o.replace(/\/$/, "")));
  const botAuth = requireBotSecret(env);

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (env.corsAllowAll) return origin || "*";
        if (!origin) return env.corsOrigins[0] ?? "*";
        const normalized = origin.replace(/\/$/, "");
        return allowed.has(normalized) ? origin : null;
      },
      allowMethods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/api/roster", async (c) => {
    try {
      return c.json(
        await cachedJson("roster", cacheMs, () => buildRosterResponse(env)),
      );
    } catch (error) {
      console.error("[roster]", error);
      return c.json({ error: "Failed to build roster" }, 500);
    }
  });

  app.get("/api/leaderboards", async (c) => {
    try {
      return c.json(
        await cachedJson("leaderboards", cacheMs, () =>
          buildLeaderboardsResponse(env),
        ),
      );
    } catch (error) {
      console.error("[leaderboards]", error);
      return c.json({ error: "Failed to build leaderboards" }, 500);
    }
  });

  app.get("/api/battle-rewards", async (c) => {
    try {
      return c.json(
        await cachedJson("battle-rewards", Math.min(cacheMs, 60_000), () =>
          buildBattleRewardsResponse(),
        ),
      );
    } catch (error) {
      console.error("[battle-rewards]", error);
      return c.json({ error: "Failed to build battle rewards" }, 500);
    }
  });

  app.get("/api/registry", async (c) => {
    try {
      return c.json(
        await cachedJson("registry", cacheMs, () => buildRegistryResponse(env)),
      );
    } catch (error) {
      console.error("[registry]", error);
      return c.json({ error: "Failed to build registry" }, 500);
    }
  });

  app.get("/api/battle-archive", async (c) => {
    try {
      return c.json(await buildBattleArchiveResponse(env));
    } catch (error) {
      console.error("[battle-archive]", error);
      return c.json({ error: "Failed to build battle archive" }, 500);
    }
  });

  app.get("/api/battles/:id", async (c) => {
    try {
      const detail = await buildBattleDetail(env, c.req.param("id"));
      if (!detail) return c.json({ error: "Battle not found" }, 404);
      return c.json(detail);
    } catch (error) {
      console.error("[battle-detail]", error);
      return c.json({ error: "Failed to build battle detail" }, 500);
    }
  });

  app.get("/api/graphs", async (c) => {
    try {
      const hours = Number(c.req.query("hours") ?? 12);
      const clamped = Math.min(
        48,
        Math.max(1, Number.isFinite(hours) ? hours : 12),
      );
      return c.json(
        await cachedJson(`graphs:${clamped}`, cacheMs, () =>
          buildGraphsResponse(env, clamped),
        ),
      );
    } catch (error) {
      console.error("[graphs]", error);
      return c.json({ error: "Failed to build graphs" }, 500);
    }
  });

  app.get("/api/leagues", async (c) => {
    try {
      return c.json(
        await cachedJson("leagues", cacheMs, () => buildLeaguesResponse()),
      );
    } catch (error) {
      console.error("[leagues]", error);
      return c.json({ error: "Failed to build leagues" }, 500);
    }
  });

  app.get("/api/leagues/detail", async (c) => {
    const name = c.req.query("name")?.trim() ?? "";
    if (!name) return c.json({ error: "name query required" }, 400);
    if (name.length > 64) return c.json({ error: "name too long" }, 400);
    try {
      const key = `league-detail:${name.toLowerCase()}`;
      const detail = await cachedJson(key, Math.min(30_000, cacheMs), () =>
        buildLeagueDetail(name),
      );
      if (!detail) return c.json({ error: "League not found" }, 404);
      return c.json(detail);
    } catch (error) {
      console.error("[leagues/detail]", error);
      return c.json({ error: "Failed to load league detail" }, 500);
    }
  });

  app.get("/api/leagues/tracked", async (c) => {
    try {
      return c.json(await listTrackedLeagues());
    } catch (error) {
      console.error("[leagues/tracked]", error);
      return c.json({ error: "Failed to list tracked leagues" }, 500);
    }
  });

  app.post("/api/leagues/tracked", botAuth, async (c) => {
    try {
      const body = AddTrackedLeagueBodySchema.parse(await c.req.json());
      const result = await addTrackedLeague({
        name: body.name,
        addedBy: body.addedBy,
      });
      if (!result.ok) {
        return c.json({ error: result.error }, result.status);
      }
      invalidateResponseCache();
      return c.json({
        ok: true,
        leagueId: result.leagueId,
        name: result.name,
        pending: result.pending ?? false,
      });
    } catch (error) {
      console.error("[leagues/tracked POST]", error);
      return c.json({ error: "Failed to add tracked league" }, 500);
    }
  });

  app.delete("/api/leagues/tracked", botAuth, async (c) => {
    try {
      const result = await clearTrackedLeagues();
      invalidateResponseCache();
      return c.json(result);
    } catch (error) {
      console.error("[leagues/tracked CLEAR]", error);
      return c.json({ error: "Failed to clear tracked leagues" }, 500);
    }
  });

  app.delete("/api/leagues/tracked/:name", botAuth, async (c) => {
    try {
      const result = await removeTrackedLeague(c.req.param("name") ?? "");
      if (!result.ok) {
        return c.json({ error: result.error }, result.status);
      }
      invalidateResponseCache();
      return c.json({
        ok: true,
        leagueId: result.leagueId,
        name: result.name,
      });
    } catch (error) {
      console.error("[leagues/tracked DELETE]", error);
      return c.json({ error: "Failed to remove tracked league" }, 500);
    }
  });

  app.get("/api/leagues/settings", async (c) => {
    try {
      return c.json(await getLeagueSettings());
    } catch (error) {
      console.error("[leagues/settings]", error);
      return c.json({ error: "Failed to load league settings" }, 500);
    }
  });

  app.post("/api/leagues/settings/additions", botAuth, async (c) => {
    try {
      let body: { open?: boolean } = {};
      const raw = await c.req.text();
      if (raw.trim()) {
        body = SetLeagueAdditionsBodySchema.parse(JSON.parse(raw));
      }
      const result = await setAdditionsOpen({ open: body.open });
      invalidateResponseCache();
      return c.json(result);
    } catch (error) {
      console.error("[leagues/settings/additions]", error);
      return c.json({ error: "Failed to update additions lock" }, 500);
    }
  });

  app.post("/api/leagues/settings/channel", botAuth, async (c) => {
    try {
      const body = SetLeagueChannelBodySchema.parse(await c.req.json());
      const result = await setLeagueChannel(body.channelId);
      invalidateResponseCache();
      return c.json(result);
    } catch (error) {
      console.error("[leagues/settings/channel]", error);
      return c.json({ error: "Failed to set league channel" }, 500);
    }
  });

  app.post("/api/leagues/settings/summary-message", botAuth, async (c) => {
    try {
      const body = (await c.req.json()) as { messageId?: string | null };
      await setSummaryMessageId(body.messageId ?? null);
      return c.json({ ok: true });
    } catch (error) {
      console.error("[leagues/settings/summary]", error);
      return c.json({ error: "Failed to set summary message" }, 500);
    }
  });

  app.get("/api/leagues/discord", async (c) => {
    try {
      return c.json(await listDiscordLeagues());
    } catch (error) {
      console.error("[leagues/discord]", error);
      return c.json({ error: "Failed to list Discord leagues" }, 500);
    }
  });

  app.post("/api/leagues/discord", botAuth, async (c) => {
    try {
      const body = CreateDiscordLeagueBodySchema.parse(await c.req.json());
      const result = await createDiscordLeague(body);
      if (!result.ok) return c.json({ error: result.error }, result.status);
      invalidateResponseCache();
      return c.json({ ok: true, league: result.league });
    } catch (error) {
      console.error("[leagues/discord POST]", error);
      return c.json({ error: "Failed to create Discord league" }, 500);
    }
  });

  app.post("/api/leagues/discord/members", botAuth, async (c) => {
    try {
      const body = DiscordMemberBodySchema.parse(await c.req.json());
      const result = await addDiscordMember(body);
      if (!result.ok) return c.json({ error: result.error }, result.status);
      invalidateResponseCache();
      return c.json({ ok: true, league: result.league });
    } catch (error) {
      console.error("[leagues/discord members POST]", error);
      return c.json({ error: "Failed to add member" }, 500);
    }
  });

  app.delete("/api/leagues/discord/members", botAuth, async (c) => {
    try {
      const body = DiscordMemberBodySchema.parse(await c.req.json());
      const result = await removeDiscordMember(body);
      if (!result.ok) return c.json({ error: result.error }, result.status);
      invalidateResponseCache();
      return c.json({ ok: true, league: result.league });
    } catch (error) {
      console.error("[leagues/discord members DELETE]", error);
      return c.json({ error: "Failed to remove member" }, 500);
    }
  });

  app.delete("/api/leagues/discord/mine", botAuth, async (c) => {
    try {
      const ownerId = c.req.query("ownerId") ?? "";
      const result = await disbandDiscordLeague(ownerId);
      if (!result.ok) return c.json({ error: result.error }, result.status);
      invalidateResponseCache();
      return c.json({ ok: true, league: result.league });
    } catch (error) {
      console.error("[leagues/discord disband]", error);
      return c.json({ error: "Failed to disband league" }, 500);
    }
  });

  app.delete("/api/leagues/discord", botAuth, async (c) => {
    try {
      const result = await clearAllDiscordLeagues();
      invalidateResponseCache();
      return c.json({ ok: true, ...result });
    } catch (error) {
      console.error("[leagues/discord clearall]", error);
      return c.json({ error: "Failed to clear Discord leagues" }, 500);
    }
  });

  app.get("/api/global-leaderboard", async (c) => {
    try {
      const q = c.req.query("q") ?? "";
      const clan = c.req.query("clan") ?? "";
      const limit = Number(c.req.query("limit") ?? 50);
      const offset = Number(c.req.query("offset") ?? 0);
      const cacheKey = `global:${q}:${clan}:${limit}:${offset}`;
      return c.json(
        await cachedJson(cacheKey, cacheMs, () =>
          buildGlobalLeaderboardResponse(env, {
            q: q || undefined,
            clan: clan || undefined,
            limit,
            offset,
          }),
        ),
      );
    } catch (error) {
      console.error("[global]", error);
      return c.json({ error: "Failed to build global leaderboard" }, 500);
    }
  });

  return app;
}

const env = loadEnv();
const app = createApp(env);
const port = env.listenPort;

console.log(`[api] listening on http://localhost:${port}`);
console.log(
  `[api] CORS ${env.corsAllowAll ? "allow-all (*)" : `origins=${env.corsOrigins.join(",")}`}`,
);
Bun.serve({ port, fetch: app.fetch });
