import {
  AddTrackedLeagueBodySchema,
  BattleArchiveResponseSchema,
  BattleDetailSchema,
  BattleRewardsResponseSchema,
  ClearTrackedLeaguesResponseSchema,
  CreateDiscordLeagueBodySchema,
  DiscordLeaguesResponseSchema,
  DiscordMemberBodySchema,
  GlobalLeaderboardResponseSchema,
  GraphsResponseSchema,
  LeaderboardsResponseSchema,
  LeagueSettingsResponseSchema,
  LeaguesResponseSchema,
  RegistryResponseSchema,
  RosterResponseSchema,
  SetLeagueChannelBodySchema,
  TrackedLeaguesResponseSchema,
  type BattleArchiveResponse,
  type BattleDetail,
  type BattleRewardsResponse,
  type ClearTrackedLeaguesResponse,
  type GlobalLeaderboardResponse,
  type GraphsResponse,
  type LeaderboardsResponse,
  type LeagueSettingsResponse,
  type LeaguesResponse,
  type RegistryResponse,
  type RosterResponse,
  type TrackedLeaguesResponse,
} from "@k0ii/schemas";
import { z } from "zod";

import { ApiError } from "./errors";

type SchemaParse<T> = { parse: (data: unknown) => T };

export type ApiClient = ReturnType<typeof createApiClient>;

const MutateOkSchema = z.object({
  ok: z.literal(true),
  leagueId: z.string(),
  name: z.string(),
  pending: z.boolean().optional(),
});

const AdditionsStateSchema = z.object({
  additionsOpen: z.boolean(),
});

const DiscordLeagueOkSchema = z.object({
  ok: z.literal(true),
  league: z.object({
    id: z.string(),
    name: z.string(),
    ownerId: z.string(),
    memberIds: z.array(z.string()),
    createdAt: z.number(),
  }),
});

const ChannelOkSchema = z.object({
  channelId: z.string().nullable(),
  summaryMessageId: z.string().nullable().optional(),
});

export function createApiClient(baseUrl: string, botSecret?: string) {
  async function apiFetch<T>(
    path: string,
    schema: SchemaParse<T>,
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    if (botSecret) headers.set("X-Bot-Secret", botSecret);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        ...init,
        headers,
      });
    } catch (err) {
      const aborted =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      throw new ApiError(
        path,
        0,
        aborted
          ? "API request timed out"
          : err instanceof Error
            ? err.message
            : "API unreachable",
      );
    }
    if (!res.ok) {
      let detail: string | undefined;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) detail = body.error;
      } catch {
        /* ignore */
      }
      throw new ApiError(path, res.status, detail);
    }
    if (res.status === 204) return schema.parse({});
    return schema.parse(await res.json());
  }

  return {
    roster(): Promise<RosterResponse> {
      return apiFetch("/api/roster", RosterResponseSchema);
    },
    leaderboards(): Promise<LeaderboardsResponse> {
      return apiFetch("/api/leaderboards", LeaderboardsResponseSchema);
    },
    battleRewards(): Promise<BattleRewardsResponse> {
      return apiFetch("/api/battle-rewards", BattleRewardsResponseSchema);
    },
    registry(): Promise<RegistryResponse> {
      return apiFetch("/api/registry", RegistryResponseSchema);
    },
    battleArchive(): Promise<BattleArchiveResponse> {
      return apiFetch("/api/battle-archive", BattleArchiveResponseSchema);
    },
    battleDetail(id: string): Promise<BattleDetail> {
      return apiFetch(
        `/api/battles/${encodeURIComponent(id)}`,
        BattleDetailSchema,
      );
    },
    graphs(hours = 12): Promise<GraphsResponse> {
      return apiFetch(`/api/graphs?hours=${hours}`, GraphsResponseSchema);
    },
    leagues(): Promise<LeaguesResponse> {
      return apiFetch("/api/leagues", LeaguesResponseSchema);
    },
    trackedLeagues(): Promise<TrackedLeaguesResponse> {
      return apiFetch("/api/leagues/tracked", TrackedLeaguesResponseSchema);
    },
    addLeague(name: string, addedBy?: string) {
      const body = AddTrackedLeagueBodySchema.parse({ name, addedBy });
      return apiFetch("/api/leagues/tracked", MutateOkSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    removeLeague(name: string) {
      return apiFetch(
        `/api/leagues/tracked/${encodeURIComponent(name)}`,
        MutateOkSchema,
        { method: "DELETE" },
      );
    },
    clearTrackedLeagues(): Promise<ClearTrackedLeaguesResponse> {
      return apiFetch("/api/leagues/tracked", ClearTrackedLeaguesResponseSchema, {
        method: "DELETE",
      });
    },
    leagueSettings(): Promise<LeagueSettingsResponse> {
      return apiFetch("/api/leagues/settings", LeagueSettingsResponseSchema);
    },
    setLeagueAdditions(open?: boolean) {
      return apiFetch("/api/leagues/settings/additions", AdditionsStateSchema, {
        method: "POST",
        body: JSON.stringify(typeof open === "boolean" ? { open } : {}),
      });
    },
    setLeagueChannel(channelId: string | null) {
      const body = SetLeagueChannelBodySchema.parse({ channelId });
      return apiFetch("/api/leagues/settings/channel", ChannelOkSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    setSummaryMessageId(messageId: string | null) {
      return apiFetch(
        "/api/leagues/settings/summary-message",
        z.object({ ok: z.literal(true) }),
        {
          method: "POST",
          body: JSON.stringify({ messageId }),
        },
      );
    },
    listDiscordLeagues() {
      return apiFetch("/api/leagues/discord", DiscordLeaguesResponseSchema);
    },
    createDiscordLeague(name: string, ownerId: string) {
      const body = CreateDiscordLeagueBodySchema.parse({ name, ownerId });
      return apiFetch("/api/leagues/discord", DiscordLeagueOkSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    addDiscordMember(ownerId: string, userId: string) {
      const body = DiscordMemberBodySchema.parse({ ownerId, userId });
      return apiFetch("/api/leagues/discord/members", DiscordLeagueOkSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    removeDiscordMember(ownerId: string, userId: string) {
      const body = DiscordMemberBodySchema.parse({ ownerId, userId });
      return apiFetch("/api/leagues/discord/members", DiscordLeagueOkSchema, {
        method: "DELETE",
        body: JSON.stringify(body),
      });
    },
    disbandDiscordLeague(ownerId: string) {
      return apiFetch(
        `/api/leagues/discord/mine?ownerId=${encodeURIComponent(ownerId)}`,
        DiscordLeagueOkSchema,
        { method: "DELETE" },
      );
    },
    clearDiscordLeagues() {
      return apiFetch(
        "/api/leagues/discord",
        z.object({ ok: z.literal(true), cleared: z.number() }),
        { method: "DELETE" },
      );
    },
    globalLeaderboard(params: {
      q?: string;
      clan?: string;
      limit?: number;
      offset?: number;
    } = {}): Promise<GlobalLeaderboardResponse> {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.clan) qs.set("clan", params.clan);
      if (params.limit != null) qs.set("limit", String(params.limit));
      if (params.offset != null) qs.set("offset", String(params.offset));
      const query = qs.toString();
      return apiFetch(
        `/api/global-leaderboard${query ? `?${query}` : ""}`,
        GlobalLeaderboardResponseSchema,
      );
    },
  };
}
