import type { GlobalLeaderboardResponse } from "@k0ii/schemas";
import type { Env } from "../env";
import { fetchRobloxDisplayNames } from "./ps99-client";
import { loadGlobalPlayerIndex } from "./refresh-global-index";

/** In-memory Roblox username cache for Global page slices (not Prisma). */
const nameCache = new Map<string, string>();

export async function buildGlobalLeaderboardResponse(
  env: Env,
  opts: { q?: string; clan?: string; limit?: number; offset?: number },
): Promise<GlobalLeaderboardResponse> {
  const now = Date.now();
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);
  const q = opts.q?.trim().toLowerCase() ?? "";
  const clanFilter = opts.clan?.trim().toLowerCase() ?? "";

  const index = await loadGlobalPlayerIndex();
  if (!index || !index.totalPlayers) {
    return {
      generatedAt: now,
      total: 0,
      universeTotal: 0,
      limit,
      offset,
      players: [],
    };
  }

  let rows = Object.entries(index.players).map(([robloxUserId, rec]) => ({
    robloxUserId,
    clanName: rec.clanName,
    points: rec.points,
    rank: rec.rank,
    isOurs: rec.clanName.toLowerCase() === env.CLAN_NAME.toLowerCase(),
  }));

  if (clanFilter) {
    rows = rows.filter((r) => r.clanName.toLowerCase().includes(clanFilter));
  }

  // Name filter needs Roblox names — resolve missing ids first when searching.
  if (q) {
    const missing = rows
      .map((r) => r.robloxUserId)
      .filter((id) => !nameCache.has(id));
    if (missing.length) {
      // Cap search-name resolve to avoid hammering Roblox on huge indexes.
      const batch = missing.slice(0, 2000);
      const names = await fetchRobloxDisplayNames(batch);
      for (const [id, name] of Object.entries(names)) nameCache.set(id, name);
    }
    rows = rows.filter((r) => {
      const name = (nameCache.get(r.robloxUserId) ?? "").toLowerCase();
      return name.includes(q) || r.robloxUserId.includes(q);
    });
  }

  rows.sort((a, b) => b.points - a.points || a.rank - b.rank);
  const total = rows.length;
  const pageRows = rows.slice(offset, offset + limit);

  const pageIds = pageRows
    .map((r) => r.robloxUserId)
    .filter((id) => !nameCache.has(id));
  if (pageIds.length) {
    const names = await fetchRobloxDisplayNames(pageIds);
    for (const [id, name] of Object.entries(names)) nameCache.set(id, name);
  }

  const players = pageRows.map((r) => ({
    /** True global rank from index — not page position. */
    rank: r.rank,
    displayName: nameCache.get(r.robloxUserId) ?? `User ${r.robloxUserId}`,
    robloxUserId: r.robloxUserId,
    clanName: r.clanName,
    points: r.points,
    isOurs: r.isOurs,
  }));

  return {
    generatedAt: index.updatedAt || now,
    total,
    universeTotal: index.totalPlayers,
    limit,
    offset,
    players,
  };
}
