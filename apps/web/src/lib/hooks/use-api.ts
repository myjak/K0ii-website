"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchBattleArchive,
  fetchBattleDetail,
  fetchBattleRewards,
  fetchGlobalLeaderboard,
  fetchGraphs,
  fetchLeaderboards,
  fetchLeagues,
  fetchRegistry,
  fetchRoster,
} from "@/lib/api/client";
import type { RosterResponse } from "@k0ii/schemas";

export const queryKeys = {
  roster: ["roster"] as const,
  leaderboards: ["leaderboards"] as const,
  battleRewards: ["battle-rewards"] as const,
  battleArchive: ["battle-archive"] as const,
  registry: ["registry"] as const,
  battle: (id: string) => ["battle", id] as const,
  graphs: (hours: number) => ["graphs", hours] as const,
  leagues: ["leagues"] as const,
  global: (params: Record<string, string | number | undefined>) =>
    ["global", params] as const,
};

/** Match free-tier live poll (5 min). */
const DEFAULT_LIVE_REFETCH_MS = 300_000;

export function useRoster(options?: {
  refetchInterval?: number | false;
  initialData?: RosterResponse;
}) {
  return useQuery({
    queryKey: queryKeys.roster,
    queryFn: fetchRoster,
    refetchInterval: options?.refetchInterval ?? DEFAULT_LIVE_REFETCH_MS,
    initialData: options?.initialData,
    // Keep SSR snapshot fresh enough that mount does not flash isFetching=true
    staleTime: options?.initialData ? 60_000 : 30_000,
  });
}

export function useLeaderboards(options?: {
  refetchInterval?: number | false;
}) {
  return useQuery({
    queryKey: queryKeys.leaderboards,
    queryFn: fetchLeaderboards,
    refetchInterval: options?.refetchInterval ?? DEFAULT_LIVE_REFETCH_MS,
  });
}

export function useBattleRewards() {
  return useQuery({
    queryKey: queryKeys.battleRewards,
    queryFn: fetchBattleRewards,
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

export function useRegistry(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: queryKeys.registry,
    queryFn: fetchRegistry,
    refetchInterval: options?.refetchInterval ?? DEFAULT_LIVE_REFETCH_MS,
    staleTime: 60_000,
  });
}

export function useBattleArchive() {
  return useQuery({
    queryKey: queryKeys.battleArchive,
    queryFn: fetchBattleArchive,
  });
}

export function useBattleDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.battle(id ?? ""),
    queryFn: () => fetchBattleDetail(id!),
    enabled: !!id,
  });
}

export function useGraphs(hours: number) {
  return useQuery({
    queryKey: queryKeys.graphs(hours),
    queryFn: () => fetchGraphs(hours),
    refetchInterval: DEFAULT_LIVE_REFETCH_MS,
  });
}

export function useLeagues(options?: {
  initialData?: Awaited<ReturnType<typeof fetchLeagues>> | null;
}) {
  return useQuery({
    queryKey: queryKeys.leagues,
    queryFn: fetchLeagues,
    initialData: options?.initialData ?? undefined,
    refetchInterval: DEFAULT_LIVE_REFETCH_MS,
  });
}

export function useGlobalLeaderboard(params: {
  q?: string;
  clan?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.global(params),
    queryFn: () => fetchGlobalLeaderboard(params),
  });
}
