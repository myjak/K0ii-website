import type { Env } from "../env";
import { prisma } from "../lib/prisma";
import {
  fetchLeagueDetail,
  fetchLeaguesPage,
  type V1LeagueDetail,
  type V1LeagueListEntry,
} from "./ps99-client";
import {
  isProvisionalLeagueId,
  resolveTrackedLeagueId,
} from "./tracked-leagues";

const LEAGUE_SNAP_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const AUTO_PREFIXES = ["k0i", "koi"] as const;
const EXCLUDED_NAMES = new Set(["k0ii7"]);
const TOP_PAGES = 4;
const PAGE_SIZE = 100;
const WRITE_DEBOUNCE_MS = 60_000;

type SnapRow = {
  leagueId: string;
  name: string;
  capturedAt: Date;
  points: bigint;
  rank: number | null;
  memberCount: number | null;
  contributorCount: number | null;
  memberPointsJson?: Record<string, number> | null;
};

let lastHistoryWriteAt = 0;

function entryToRow(
  entry: V1LeagueListEntry,
  rank: number | null,
  capturedAt: Date,
): SnapRow {
  return {
    leagueId: entry.ID,
    name: entry.Name,
    capturedAt,
    points: BigInt(Math.max(0, Math.floor(entry.Points ?? 0))),
    rank,
    memberCount: entry.Members ?? null,
    contributorCount: entry.ContributorCount ?? null,
  };
}

function ownerPresent(owner: unknown): boolean {
  if (owner == null) return false;
  if (typeof owner === "number") return owner > 0;
  if (typeof owner === "object" && owner !== null && "UserID" in owner) {
    return Boolean((owner as { UserID?: number }).UserID);
  }
  return true;
}

function memberPointsFromDetail(
  detail: V1LeagueDetail,
): Record<string, number> | null {
  const contribs = detail.PointContributions;
  if (!Array.isArray(contribs) || contribs.length === 0) return null;
  const out: Record<string, number> = {};
  for (const row of contribs) {
    if (!row || typeof row !== "object") continue;
    const r = row as { UserID?: number; Points?: number };
    if (r.UserID == null || r.Points == null) continue;
    out[String(r.UserID)] = Math.max(0, Math.floor(r.Points));
  }
  return Object.keys(out).length ? out : null;
}

function detailToRow(detail: V1LeagueDetail, capturedAt: Date): SnapRow {
  return {
    leagueId: detail.ID,
    name: detail.Name,
    capturedAt,
    points: BigInt(Math.max(0, Math.floor(detail.Points ?? 0))),
    rank: null,
    memberCount: Array.isArray(detail.Members)
      ? detail.Members.length + (ownerPresent(detail.Owner) ? 1 : 0)
      : null,
    contributorCount:
      detail.ContributorCount ??
      (Array.isArray(detail.PointContributions)
        ? detail.PointContributions.length
        : null),
    memberPointsJson: memberPointsFromDetail(detail),
  };
}

async function fetchTopBoard(capturedAt: Date): Promise<{
  byId: Map<string, SnapRow>;
  byName: Map<string, SnapRow>;
}> {
  const byId = new Map<string, SnapRow>();
  const byName = new Map<string, SnapRow>();

  for (let page = 1; page <= TOP_PAGES; page++) {
    const data = await fetchLeaguesPage({
      page,
      pageSize: PAGE_SIZE,
      sort: "Points",
      sortOrder: "desc",
    });
    if (!data?.leagues?.length) break;
    data.leagues.forEach((entry, i) => {
      if (!entry?.ID || !entry.Name) return;
      const rank = (page - 1) * PAGE_SIZE + i + 1;
      const row = entryToRow(entry, rank, capturedAt);
      if (!byId.has(entry.ID)) {
        byId.set(entry.ID, row);
        byName.set(entry.Name.toLowerCase(), row);
      }
    });
    if (data.leagues.length < PAGE_SIZE) break;
  }

  return { byId, byName };
}

async function fetchAutoPrefixNames(): Promise<string[]> {
  const found = new Set<string>();
  for (const prefix of AUTO_PREFIXES) {
    const data = await fetchLeaguesPage({
      page: 1,
      pageSize: PAGE_SIZE,
      sort: "Points",
      sortOrder: "desc",
      search: prefix,
    });
    for (const entry of data?.leagues ?? []) {
      const lower = (entry.NameLower ?? entry.Name ?? "").toLowerCase();
      if (!lower.startsWith(prefix)) continue;
      if (EXCLUDED_NAMES.has(lower)) continue;
      if (entry.Name) found.add(entry.Name);
    }
  }
  return [...found];
}

async function buildTrackedNames(): Promise<string[]> {
  const [discord, pinned] = await Promise.all([
    prisma.discordLeague.findMany({ select: { name: true } }),
    prisma.trackedLeague.findMany({ select: { name: true } }),
  ]);
  const auto = await fetchAutoPrefixNames();
  const names = new Set<string>();
  for (const n of [
    ...discord.map((d) => d.name),
    ...pinned.map((p) => p.name),
    ...auto,
  ]) {
    const trimmed = n.trim();
    if (!trimmed) continue;
    if (EXCLUDED_NAMES.has(trimmed.toLowerCase())) continue;
    names.add(trimmed);
  }
  return [...names];
}

/** Poll PS99 league ladder + tracked set into LeagueSnapshot. */
export async function pollLeagues(_env: Env): Promise<{ snapped: number }> {
  const now = Date.now();
  if (
    lastHistoryWriteAt > 0 &&
    now - lastHistoryWriteAt < WRITE_DEBOUNCE_MS
  ) {
    console.log("[leagues-poll] debounce skip");
    return { snapped: 0 };
  }

  const capturedAt = new Date(now);
  const { byId, byName } = await fetchTopBoard(capturedAt);
  if (byId.size === 0) {
    console.warn("[leagues-poll] empty top board from PS99");
  }

  const trackedNames = await buildTrackedNames();
  const pinnedRows = await prisma.trackedLeague.findMany();

  for (const name of trackedNames) {
    const lower = name.toLowerCase();
    const fromLadder = byName.get(lower);
    if (fromLadder) {
      const pinned = pinnedRows.find(
        (p) => p.name.toLowerCase() === lower || p.leagueId === fromLadder.leagueId,
      );
      if (pinned && (pinned.leagueId !== fromLadder.leagueId || pinned.name !== fromLadder.name)) {
        await resolveTrackedLeagueId({
          trackedId: pinned.id,
          leagueId: fromLadder.leagueId,
          name: fromLadder.name,
        });
      }
      // Enrich top-board row with detail contributions when tracked.
      const detail = await fetchLeagueDetail(fromLadder.name);
      if (detail?.ID) {
        const enriched = detailToRow(detail, capturedAt);
        enriched.rank = fromLadder.rank;
        byId.set(detail.ID, enriched);
        byName.set(detail.Name.toLowerCase(), enriched);
      }
      continue;
    }

    const detail = await fetchLeagueDetail(name);
    if (!detail?.ID) {
      const pinned = pinnedRows.find((p) => p.name.toLowerCase() === lower);
      if (pinned && isProvisionalLeagueId(pinned.leagueId)) {
        console.log(
          `[leagues-poll] pending tracked league still unresolved: ${name}`,
        );
      } else {
        console.warn(
          `[leagues-poll] tracked league not found (kept): ${name}`,
        );
      }
      continue;
    }

    const pinned = pinnedRows.find(
      (p) =>
        p.name.toLowerCase() === lower ||
        p.leagueId === detail.ID ||
        isProvisionalLeagueId(p.leagueId),
    );
    if (pinned && (pinned.leagueId !== detail.ID || pinned.name !== detail.Name)) {
      await resolveTrackedLeagueId({
        trackedId: pinned.id,
        leagueId: detail.ID,
        name: detail.Name,
      });
    }

    byId.set(detail.ID, detailToRow(detail, capturedAt));
  }

  const rows = [...byId.values()];
  if (rows.length === 0) return { snapped: 0 };

  await prisma.leagueSnapshot.createMany({
    data: rows.map((r) => ({
      leagueId: r.leagueId,
      name: r.name,
      capturedAt: r.capturedAt,
      points: r.points,
      rank: r.rank,
      memberCount: r.memberCount,
      contributorCount: r.contributorCount,
      memberPointsJson: r.memberPointsJson ?? undefined,
    })),
  });
  lastHistoryWriteAt = now;

  const cutoff = new Date(now - LEAGUE_SNAP_KEEP_MS);
  const pruned = await prisma.leagueSnapshot.deleteMany({
    where: { capturedAt: { lt: cutoff } },
  });
  if (pruned.count > 0) {
    console.log(`[leagues-poll] pruned ${pruned.count} snaps (>7d)`);
  }

  console.log(
    `[leagues-poll] snapped=${rows.length} trackedNames=${trackedNames.length} board=${byId.size}`,
  );
  return { snapped: rows.length };
}

export function leaguePollIntervalMs(env: Env): number {
  return env.LEAGUE_POLL_INTERVAL_MS ?? env.POLL_INTERVAL_MS;
}
