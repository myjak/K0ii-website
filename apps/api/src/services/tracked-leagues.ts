import { prisma } from "../lib/prisma";
import { fetchLeagueDetail } from "./ps99-client";

export type TrackedLeagueMutationResult =
  | { ok: true; leagueId: string; name: string; pending?: boolean }
  | { ok: false; status: 404 | 409 | 400 | 403; error: string };

export type ClearTrackedResult = {
  ok: true;
  cleared: number;
};

/** Placeholder id until PS99 league exists / resolves. */
export function provisionalLeagueId(name: string): string {
  return `pending:${name.trim().toLowerCase()}`;
}

export function isProvisionalLeagueId(leagueId: string): boolean {
  return leagueId.startsWith("pending:");
}

async function getOrCreateSettings() {
  return prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: { id: "current", additionsOpen: true },
    update: {},
  });
}

export async function getLeagueSettings() {
  const row = await getOrCreateSettings();
  return {
    additionsOpen: row.additionsOpen,
    channelId: row.channelId,
    summaryMessageId: row.summaryMessageId,
    updatedAt: row.updatedAt.getTime(),
  };
}

/** Flip or set whether new leagues can be added. */
export async function setAdditionsOpen(opts: {
  open?: boolean;
}): Promise<{ additionsOpen: boolean }> {
  const current = await getOrCreateSettings();
  const next =
    typeof opts.open === "boolean" ? opts.open : !current.additionsOpen;
  const row = await prisma.leagueSettings.update({
    where: { id: "current" },
    data: { additionsOpen: next },
  });
  return { additionsOpen: row.additionsOpen };
}

export async function addTrackedLeague(opts: {
  name: string;
  addedBy?: string | null;
}): Promise<TrackedLeagueMutationResult> {
  const name = opts.name.trim().slice(0, 64);
  if (!name) return { ok: false, status: 400, error: "Name required" };

  const settings = await getOrCreateSettings();
  if (!settings.additionsOpen) {
    return {
      ok: false,
      status: 403,
      error: "League additions are locked. Use `/league toggle-add` to open.",
    };
  }

  const existingByName = await prisma.trackedLeague.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  const detail = await fetchLeagueDetail(name);

  if (detail?.ID && detail.Name) {
    // Prefer real PS99 id; drop provisional row with same name if needed.
    if (existingByName && existingByName.leagueId !== detail.ID) {
      await prisma.trackedLeague.delete({ where: { id: existingByName.id } });
    }

    const byId = await prisma.trackedLeague.findUnique({
      where: { leagueId: detail.ID },
    });
    if (byId) {
      await prisma.trackedLeague.update({
        where: { id: byId.id },
        data: {
          name: detail.Name,
          ...(opts.addedBy ? { addedBy: opts.addedBy } : {}),
        },
      });
      return { ok: true, leagueId: detail.ID, name: detail.Name };
    }

    await prisma.trackedLeague.create({
      data: {
        leagueId: detail.ID,
        name: detail.Name,
        addedBy: opts.addedBy ?? null,
      },
    });
    return { ok: true, leagueId: detail.ID, name: detail.Name };
  }

  // Not on PS99 yet — keep tracked with provisional id so we can pre-register.
  if (existingByName) {
    await prisma.trackedLeague.update({
      where: { id: existingByName.id },
      data: {
        name: existingByName.name,
        ...(opts.addedBy ? { addedBy: opts.addedBy } : {}),
      },
    });
    return {
      ok: true,
      leagueId: existingByName.leagueId,
      name: existingByName.name,
      pending: isProvisionalLeagueId(existingByName.leagueId),
    };
  }

  const leagueId = provisionalLeagueId(name);
  await prisma.trackedLeague.create({
    data: {
      leagueId,
      name,
      addedBy: opts.addedBy ?? null,
    },
  });

  return { ok: true, leagueId, name, pending: true };
}

export async function removeTrackedLeague(
  name: string,
): Promise<TrackedLeagueMutationResult> {
  if (!name.trim()) return { ok: false, status: 400, error: "Name required" };

  const row = await prisma.trackedLeague.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (!row) {
    return { ok: false, status: 404, error: "League not tracked" };
  }

  await prisma.trackedLeague.delete({ where: { id: row.id } });
  return { ok: true, leagueId: row.leagueId, name: row.name };
}

export async function clearTrackedLeagues(): Promise<ClearTrackedResult> {
  const result = await prisma.trackedLeague.deleteMany();
  return { ok: true, cleared: result.count };
}

/** When PS99 resolves a real id, rewrite the tracked row. */
export async function resolveTrackedLeagueId(opts: {
  trackedId: string;
  leagueId: string;
  name: string;
}): Promise<void> {
  const clash = await prisma.trackedLeague.findUnique({
    where: { leagueId: opts.leagueId },
  });
  if (clash && clash.id !== opts.trackedId) {
    await prisma.trackedLeague.delete({ where: { id: opts.trackedId } });
    await prisma.trackedLeague.update({
      where: { id: clash.id },
      data: { name: opts.name },
    });
    return;
  }
  await prisma.trackedLeague.update({
    where: { id: opts.trackedId },
    data: { leagueId: opts.leagueId, name: opts.name },
  });
}
