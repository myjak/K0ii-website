import type {
  DiscordLeague,
  LeagueContributor,
  LeagueDetailResponse,
  LeagueEntry,
  LeaguesResponse,
} from "@k0ii/schemas";

import { prisma } from "../lib/prisma";
import { LEAGUE_MAX_MEMBERS } from "./discord-leagues";
import {
  fetchLeagueDetail,
  fetchRobloxAvatarMap,
  fetchRobloxDisplayNames,
} from "./ps99-client";
import {
  calculatePph,
  deltaAtWindow,
  type SeriesPoint,
} from "./stats";

const FIVE_MIN_MS = 5 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;
const SIXTY_MIN_MS = 60 * 60 * 1000;

type SnapLite = {
  leagueId: string;
  name: string;
  points: bigint;
  rank: number | null;
  contributorCount: number | null;
  memberCount: number | null;
  memberPointsJson: unknown;
};

function parseMemberPoints(
  raw: unknown,
): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [id, pts] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(id)) continue;
    const n = typeof pts === "number" ? pts : Number(pts);
    if (!Number.isFinite(n) || n < 0) continue;
    out[id] = Math.floor(n);
  }
  return Object.keys(out).length ? out : null;
}

async function resolveContributions(
  memberPoints: Record<string, number> | null,
  leaguePoints: number | null,
): Promise<LeagueContributor[]> {
  if (!memberPoints) return [];
  const ids = Object.keys(memberPoints);
  const [names, avatars] = await Promise.all([
    fetchRobloxDisplayNames(ids),
    fetchRobloxAvatarMap(ids),
  ]);
  const total =
    leaguePoints != null && leaguePoints > 0
      ? leaguePoints
      : Object.values(memberPoints).reduce((a, b) => a + b, 0);

  return ids
    .map((id) => {
      const points = memberPoints[id] ?? 0;
      return {
        robloxUserId: id,
        displayName: names[id] ?? `User ${id}`,
        avatarUrl: avatars[id] ?? null,
        points,
        sharePct:
          total > 0
            ? Math.round((points / total) * 1000) / 10
            : null,
      } satisfies LeagueContributor;
    })
    .sort((a, b) => b.points - a.points);
}

function toEntry(
  name: string,
  snap: {
    points: bigint;
    rank: number | null;
    contributorCount: number | null;
    memberCount?: number | null;
  } | null,
  series: SeriesPoint[],
  isOurs: boolean,
  extra?: Partial<LeagueEntry>,
): LeagueEntry {
  return {
    name,
    rank: snap?.rank ?? null,
    points: snap != null ? Number(snap.points) : null,
    pph: calculatePph(series),
    delta5m: deltaAtWindow(series, FIVE_MIN_MS),
    delta30m: deltaAtWindow(series, THIRTY_MIN_MS),
    delta60m: deltaAtWindow(series, SIXTY_MIN_MS),
    contributorCount: snap?.contributorCount ?? null,
    memberCount: snap?.memberCount ?? null,
    isOurs,
    ...extra,
  };
}

function mapDiscord(d: {
  id: string;
  name: string;
  ownerId: string;
  memberIds: unknown;
  createdAt: Date;
}): DiscordLeague {
  return {
    id: d.id,
    name: d.name,
    ownerId: d.ownerId,
    memberIds: Array.isArray(d.memberIds) ? (d.memberIds as string[]) : [],
    createdAt: d.createdAt.getTime(),
    capacity: LEAGUE_MAX_MEMBERS,
  };
}

export async function buildLeaguesResponse(): Promise<LeaguesResponse> {
  const [trackedRows, discordRows, settings, historyLength] = await Promise.all([
    prisma.trackedLeague.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.discordLeague.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.leagueSettings.upsert({
      where: { id: "current" },
      create: { id: "current", additionsOpen: true },
      update: {},
    }),
    prisma.leagueSnapshot.groupBy({
      by: ["capturedAt"],
      _count: true,
    }),
  ]);

  const oursNames = new Set<string>([
    ...trackedRows.map((t) => t.name.toLowerCase()),
    ...discordRows.map((d) => d.name.toLowerCase()),
  ]);
  const oursIds = new Set(trackedRows.map((t) => t.leagueId));

  const latestRanked = await prisma.leagueSnapshot.findFirst({
    where: { rank: { not: null } },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  let topSnaps: SnapLite[] = [];

  if (latestRanked) {
    topSnaps = await prisma.leagueSnapshot.findMany({
      where: {
        capturedAt: latestRanked.capturedAt,
        rank: { not: null, lte: 100 },
      },
      orderBy: { rank: "asc" },
      take: 100,
      select: {
        leagueId: true,
        name: true,
        points: true,
        rank: true,
        contributorCount: true,
        memberCount: true,
        memberPointsJson: true,
      },
    });
  }

  const seriesIds = new Set<string>([
    ...trackedRows.map((t) => t.leagueId),
    ...topSnaps.map((s) => s.leagueId),
  ]);

  const nameKeys = [
    ...trackedRows.map((t) => t.name),
    ...discordRows.map((d) => d.name),
  ];

  const seriesById = new Map<string, SeriesPoint[]>();
  const latestById = new Map<string, SnapLite>();
  const latestByName = new Map<string, SnapLite>();

  if (seriesIds.size > 0 || nameKeys.length > 0) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const orFilters: object[] = [];
    if (seriesIds.size > 0) {
      orFilters.push({ leagueId: { in: [...seriesIds] } });
    }
    if (nameKeys.length > 0) {
      orFilters.push({
        name: { in: nameKeys, mode: "insensitive" },
      });
    }
    const history = await prisma.leagueSnapshot.findMany({
      where: {
        OR: orFilters,
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: "asc" },
      select: {
        leagueId: true,
        name: true,
        capturedAt: true,
        points: true,
        rank: true,
        contributorCount: true,
        memberCount: true,
        memberPointsJson: true,
      },
    });
    for (const row of history) {
      const list = seriesById.get(row.leagueId) ?? [];
      list.push({
        timestamp: row.capturedAt.getTime(),
        value: Number(row.points),
      });
      seriesById.set(row.leagueId, list);
      const latest: SnapLite = {
        leagueId: row.leagueId,
        points: row.points,
        rank: row.rank,
        contributorCount: row.contributorCount,
        memberCount: row.memberCount,
        name: row.name,
        memberPointsJson: row.memberPointsJson,
      };
      latestById.set(row.leagueId, latest);
      latestByName.set(row.name.toLowerCase(), latest);
    }
  }

  const tracked: LeagueEntry[] = [];
  const seen = new Set<string>();
  const contribJobs: Array<{
    index: number;
    list: "tracked" | "top100";
    pointsMap: Record<string, number>;
    leaguePoints: number | null;
  }> = [];

  function pushTracked(
    entry: LeagueEntry,
    snap: SnapLite | null,
  ) {
    const idx = tracked.length;
    tracked.push(entry);
    const pointsMap = parseMemberPoints(snap?.memberPointsJson);
    if (pointsMap) {
      contribJobs.push({
        index: idx,
        list: "tracked",
        pointsMap,
        leaguePoints: entry.points,
      });
    }
  }

  for (const d of discordRows) {
    const key = d.name.toLowerCase();
    seen.add(key);
    const snap = latestByName.get(key) ?? null;
    pushTracked(
      toEntry(
        d.name,
        snap,
        snap ? seriesById.get(snap.leagueId) ?? [] : [],
        true,
        { source: "discord", pending: snap == null },
      ),
      snap,
    );
  }

  for (const t of trackedRows) {
    const key = t.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const snap = latestById.get(t.leagueId) ?? latestByName.get(key) ?? null;
    pushTracked(
      toEntry(
        snap?.name ?? t.name,
        snap,
        snap
          ? seriesById.get(snap.leagueId) ?? []
          : seriesById.get(t.leagueId) ?? [],
        true,
        {
          source: "pinned",
          pending: t.leagueId.startsWith("pending:") || snap == null,
        },
      ),
      snap,
    );
  }

  const AUTO_PREFIXES = ["k0i", "koi"] as const;
  const EXCLUDED = new Set(["k0ii7"]);
  for (const s of topSnaps) {
    const key = s.name.toLowerCase();
    if (seen.has(key) || EXCLUDED.has(key)) continue;
    if (!AUTO_PREFIXES.some((p) => key.startsWith(p))) continue;
    seen.add(key);
    pushTracked(
      toEntry(s.name, s, seriesById.get(s.leagueId) ?? [], true, {
        source: "auto",
      }),
      s,
    );
  }

  const top100: LeagueEntry[] = topSnaps.map((s) =>
    toEntry(
      s.name,
      s,
      seriesById.get(s.leagueId) ?? [],
      oursIds.has(s.leagueId) || oursNames.has(s.name.toLowerCase()),
    ),
  );

  // Resolve Roblox names only for tracked (small set). Top100 opens detail endpoint.
  if (contribJobs.length > 0) {
    await Promise.all(
      contribJobs.map(async (job) => {
        const contributions = await resolveContributions(
          job.pointsMap,
          job.leaguePoints,
        );
        if (job.list === "tracked") {
          tracked[job.index]!.contributions = contributions;
        }
      }),
    );
  }

  return {
    generatedAt: Date.now(),
    tracked,
    top100,
    discordLeagues: discordRows.map(mapDiscord),
    historyLength: historyLength.length,
    additionsOpen: settings.additionsOpen,
  };
}

export async function buildLeagueDetail(
  rawName: string,
): Promise<LeagueDetailResponse | null> {
  const name = rawName.trim();
  if (!name || name.length > 64) return null;

  const discord = await prisma.discordLeague.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  const snap = await prisma.leagueSnapshot.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { capturedAt: "desc" },
    select: {
      leagueId: true,
      name: true,
      points: true,
      rank: true,
      contributorCount: true,
      memberCount: true,
      memberPointsJson: true,
      capturedAt: true,
    },
  });

  let pointsMap = parseMemberPoints(snap?.memberPointsJson);
  let liveName = snap?.name ?? discord?.name ?? name;
  let points = snap != null ? Number(snap.points) : null;
  let rank = snap?.rank ?? null;
  let contributorCount = snap?.contributorCount ?? null;
  let memberCount = snap?.memberCount ?? null;

  // Live PS99 detail when snap has no per-member breakdown (common for top100-only rows).
  if (!pointsMap) {
    try {
      const detail = await fetchLeagueDetail(liveName);
      if (detail) {
        liveName = detail.Name || liveName;
        points = Math.max(0, Math.floor(detail.Points ?? 0));
        contributorCount =
          detail.ContributorCount ??
          (Array.isArray(detail.PointContributions)
            ? detail.PointContributions.length
            : contributorCount);
        memberCount = Array.isArray(detail.Members)
          ? detail.Members.length + (detail.Owner != null ? 1 : 0)
          : memberCount;
        const fromLive: Record<string, number> = {};
        for (const row of detail.PointContributions ?? []) {
          if (!row || typeof row !== "object") continue;
          const r = row as { UserID?: number; Points?: number };
          if (r.UserID == null || r.Points == null) continue;
          fromLive[String(r.UserID)] = Math.max(0, Math.floor(r.Points));
        }
        if (Object.keys(fromLive).length) pointsMap = fromLive;
      }
    } catch {
      // keep snap-only payload
    }
  }

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const history =
    snap != null
      ? await prisma.leagueSnapshot.findMany({
          where: {
            leagueId: snap.leagueId,
            capturedAt: { gte: since },
          },
          orderBy: { capturedAt: "asc" },
          select: { capturedAt: true, points: true },
        })
      : [];
  const series: SeriesPoint[] = history.map((h) => ({
    timestamp: h.capturedAt.getTime(),
    value: Number(h.points),
  }));

  const trackedHit = await prisma.trackedLeague.findFirst({
    where: {
      OR: [
        { name: { equals: liveName, mode: "insensitive" } },
        ...(snap ? [{ leagueId: snap.leagueId }] : []),
      ],
    },
  });

  const isOurs = Boolean(discord || trackedHit);
  const contributions = await resolveContributions(pointsMap, points);

  return {
    generatedAt: Date.now(),
    name: liveName,
    rank,
    points,
    pph: calculatePph(series),
    delta5m: deltaAtWindow(series, FIVE_MIN_MS),
    contributorCount:
      contributorCount ?? (contributions.length ? contributions.length : null),
    memberCount,
    isOurs,
    pending: snap == null && !pointsMap,
    contributions,
    discord: discord ? mapDiscord(discord) : null,
  };
}

export async function listTrackedLeagues() {
  const [rows, settings] = await Promise.all([
    prisma.trackedLeague.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.leagueSettings.upsert({
      where: { id: "current" },
      create: { id: "current", additionsOpen: true },
      update: {},
    }),
  ]);
  return {
    generatedAt: Date.now(),
    additionsOpen: settings.additionsOpen,
    tracked: rows.map((r) => ({
      leagueId: r.leagueId,
      name: r.name,
      addedBy: r.addedBy,
      createdAt: r.createdAt.getTime(),
      pending: r.leagueId.startsWith("pending:"),
    })),
  };
}
