import {
  BattleArchiveResponseSchema,
  BattleDetailSchema,
  BattleRewardsResponseSchema,
  GlobalLeaderboardResponseSchema,
  GraphsResponseSchema,
  LeaderboardsResponseSchema,
  LeagueDetailResponseSchema,
  LeaguesResponseSchema,
  RegistryResponseSchema,
  RosterResponseSchema,
  type BattleArchiveResponse,
  type BattleDetail,
  type BattleRewardsResponse,
  type GlobalLeaderboardResponse,
  type GraphsResponse,
  type LeaderboardsResponse,
  type LeagueDetailResponse,
  type LeaguesResponse,
  type RegistryResponse,
  type RosterResponse,
} from "@k0ii/schemas";
import { getApiBase } from "./config";

async function apiFetch<T>(
  path: string,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return schema.parse(await res.json());
}

export async function fetchRoster(): Promise<RosterResponse> {
  return apiFetch("/api/roster", RosterResponseSchema);
}

export async function fetchLeaderboards(): Promise<LeaderboardsResponse> {
  return apiFetch("/api/leaderboards", LeaderboardsResponseSchema);
}

export async function fetchBattleRewards(): Promise<BattleRewardsResponse> {
  return apiFetch("/api/battle-rewards", BattleRewardsResponseSchema);
}

export async function fetchRegistry(): Promise<RegistryResponse> {
  return apiFetch("/api/registry", RegistryResponseSchema);
}

export async function fetchBattleArchive(): Promise<BattleArchiveResponse> {
  return apiFetch("/api/battle-archive", BattleArchiveResponseSchema);
}

export async function fetchBattleDetail(id: string): Promise<BattleDetail> {
  return apiFetch(`/api/battles/${encodeURIComponent(id)}`, BattleDetailSchema);
}

export async function fetchGraphs(hours = 12): Promise<GraphsResponse> {
  return apiFetch(`/api/graphs?hours=${hours}`, GraphsResponseSchema);
}

export async function fetchLeagues(): Promise<LeaguesResponse> {
  return apiFetch("/api/leagues", LeaguesResponseSchema);
}

export async function fetchLeagueDetail(
  name: string,
): Promise<LeagueDetailResponse> {
  return apiFetch(
    `/api/leagues/detail?name=${encodeURIComponent(name)}`,
    LeagueDetailResponseSchema,
  );
}

export async function fetchGlobalLeaderboard(params: {
  q?: string;
  clan?: string;
  limit?: number;
  offset?: number;
}): Promise<GlobalLeaderboardResponse> {
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
}
