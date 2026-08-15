const PS99_BASE = "https://ps99.biggamesapi.io";

type Ps99Envelope<T> = {
  status: "ok" | "error";
  data?: T;
  error?: { message?: string };
};

async function fetchPs99<T>(path: string): Promise<T | null> {
  const res = await fetch(`${PS99_BASE}${path}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as Ps99Envelope<T>;
  if (body.status !== "ok" || body.data === undefined) return null;
  return body.data;
}

export type LegacyClanMember = {
  UserID: number;
  PermissionLevel?: number;
  JoinTime?: number;
};

export type LegacyBattleEntry = {
  BattleID?: string;
  Points?: number;
  PointContributions?: Array<{ UserID: number; Points: number }>;
  Place?: number;
};

export type LegacyClan = {
  Name: string;
  Icon?: string;
  Owner?: number;
  MemberCapacity?: number;
  CountryCode?: string;
  Members?: LegacyClanMember[];
  Battles?: Record<string, LegacyBattleEntry>;
  LastKickTimestamp?: number;
};

export type ActiveClanBattle = {
  configName: string;
  configData?: {
    PlacementRewards?: unknown[];
  };
};

export type V1BattleClan = {
  rank: number;
  name: string;
  icon: string;
  countryCode: string;
  members?: number;
  memberCapacity: number;
  points: number;
  reportedPlace: number | null;
  medal: string | null;
  contributorCount: number;
};

export type V1BattleDetail = {
  meta: {
    id: string;
    title: string;
    startTime: number | null;
    finishTime: number | null;
    state: "upcoming" | "live" | "past";
  };
  topClans: V1BattleClan[];
};

export async function fetchActiveClanBattle(): Promise<ActiveClanBattle | null> {
  return fetchPs99<ActiveClanBattle>("/api/activeClanBattle");
}

export async function fetchClan(name: string): Promise<LegacyClan | null> {
  return fetchPs99<LegacyClan>(`/api/clan/${encodeURIComponent(name)}`);
}

export type ClanListEntry = {
  Name: string;
  Icon?: string;
  CountryCode?: string;
  MemberCapacity?: number;
  Members?: number;
  Points?: number;
  DepositedDiamonds?: number;
  Created?: number;
};

export async function fetchClansPage(opts: {
  page: number;
  pageSize: number;
  sort?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ClanListEntry[] | null> {
  const page = Math.max(1, opts.page);
  const pageSize = Math.min(500, Math.max(1, opts.pageSize));
  const sort = opts.sort ?? "Points";
  const sortOrder = opts.sortOrder ?? "desc";
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
    sortOrder,
  });
  return fetchPs99<ClanListEntry[]>(`/api/clans?${qs.toString()}`);
}

export async function fetchBattleDetail(battleId: string): Promise<V1BattleDetail | null> {
  return fetchPs99<V1BattleDetail>(`/v1/clans/battles/${encodeURIComponent(battleId)}`);
}

export type V1LeagueListEntry = {
  Name: string;
  NameLower?: string;
  ID: string;
  Icon?: string | null;
  Level?: number;
  Points: number;
  Members?: number;
  MemberCapacity?: number;
  ContributorCount?: number;
  Owner?: number | null;
  Created?: number | null;
};

export type V1LeaguesPage = {
  leagues: V1LeagueListEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export type V1LeagueDetail = {
  Name: string;
  NameLower?: string;
  ID: string;
  Icon?: string | null;
  Level?: number;
  Points: number;
  MemberCapacity?: number;
  Created?: number | null;
  Owner?: { UserID?: number; DisplayName?: string } | number | null;
  Members?: unknown[];
  PointContributions?: unknown[];
  ContributorCount?: number;
};

export async function fetchLeaguesPage(opts: {
  page: number;
  pageSize: number;
  sort?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}): Promise<V1LeaguesPage | null> {
  const page = Math.max(1, Math.min(10_000, opts.page));
  const pageSize = Math.min(100, Math.max(1, opts.pageSize));
  const sort = opts.sort ?? "Points";
  const sortOrder = opts.sortOrder ?? "desc";
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
    sortOrder,
  });
  if (opts.search?.trim()) qs.set("search", opts.search.trim().slice(0, 64));
  return fetchPs99<V1LeaguesPage>(`/v1/leagues?${qs.toString()}`);
}

export async function fetchLeagueDetail(
  name: string,
): Promise<V1LeagueDetail | null> {
  const trimmed = name.trim().slice(0, 64);
  if (!trimmed) return null;
  return fetchPs99<V1LeagueDetail>(
    `/v1/leagues/${encodeURIComponent(trimmed)}`,
  );
}

export function extractAssetId(icon: string | null | undefined): string | null {
  if (!icon) return null;
  const match = icon.match(/(\d+)/);
  return match?.[1] ?? null;
}

export function ps99ImageUrl(assetId: string | null): string | null {
  if (!assetId) return null;
  return `${PS99_BASE}/image/${assetId}`;
}

const ROBLOX_USER_CHUNK = 100;

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

export async function fetchRobloxAvatarMap(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter((id) => /^\d+$/.test(id)))];
  if (unique.length === 0) return {};

  const map: Record<string, string> = {};
  for (const group of chunkIds(unique, ROBLOX_USER_CHUNK)) {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${group.join(",")}&size=150x150&format=Png&isCircular=true`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) continue;
    const data = (await res.json()) as {
      data?: Array<{ targetId: number; imageUrl?: string; state?: string }>;
    };
    for (const entry of data.data ?? []) {
      if (entry.state === "Completed" && entry.imageUrl) {
        map[String(entry.targetId)] = entry.imageUrl;
      }
    }
  }
  return map;
}

export async function fetchRobloxDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter((id) => /^\d+$/.test(id)))];
  if (unique.length === 0) return {};

  const map: Record<string, string> = {};
  for (const group of chunkIds(unique, ROBLOX_USER_CHUNK)) {
    const res = await fetch("https://users.roblox.com/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: group.map(Number),
        excludeBannedUsers: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      data?: Array<{ id: number; name?: string; displayName?: string }>;
    };
    for (const user of data.data ?? []) {
      // Prefer unique Roblox username for clan lists; fall back to display name.
      map[String(user.id)] = user.name || user.displayName || String(user.id);
    }
  }
  return map;
}
