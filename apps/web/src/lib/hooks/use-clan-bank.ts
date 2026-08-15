"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Clan bank balance, proxied from the bot — the stats API has no ledger.
 * Best-effort: the join page drops the tile rather than failing if it is down.
 */
async function fetchClanBank(): Promise<number | null> {
  try {
    const res = await fetch("/api/bot-bank", { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const balance = (data as { balance?: unknown })?.balance;
    return typeof balance === "number" && Number.isFinite(balance)
      ? balance
      : null;
  } catch {
    return null;
  }
}

export function useClanBank() {
  return useQuery({
    queryKey: ["clan-bank"],
    queryFn: fetchClanBank,
    staleTime: 600_000,
    refetchInterval: 600_000,
    placeholderData: null,
  });
}
