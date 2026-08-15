import { prisma } from "../lib/prisma";

export const LEAGUE_MAX_MEMBERS = 3;

export type DiscordLeagueMutation =
  | {
      ok: true;
      league: {
        id: string;
        name: string;
        ownerId: string;
        memberIds: string[];
        createdAt: number;
      };
    }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

function asMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function toPublic(row: {
  id: string;
  name: string;
  ownerId: string;
  memberIds: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    memberIds: asMemberIds(row.memberIds),
    createdAt: row.createdAt.getTime(),
  };
}

async function assertAdditionsOpen(): Promise<DiscordLeagueMutation | null> {
  const settings = await prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: { id: "current", additionsOpen: true },
    update: {},
  });
  if (!settings.additionsOpen) {
    return {
      ok: false,
      status: 403,
      error: "League additions are locked. Use `/league toggle-add` to open.",
    };
  }
  return null;
}

export async function listDiscordLeagues() {
  const rows = await prisma.discordLeague.findMany({
    orderBy: { createdAt: "asc" },
  });
  return {
    generatedAt: Date.now(),
    leagues: rows.map(toPublic),
  };
}

export async function createDiscordLeague(opts: {
  name: string;
  ownerId: string;
}): Promise<DiscordLeagueMutation> {
  const locked = await assertAdditionsOpen();
  if (locked) return locked;

  const name = opts.name.trim().slice(0, 32);
  if (!name) return { ok: false, status: 400, error: "Name required" };

  const owns = await prisma.discordLeague.findFirst({
    where: { ownerId: opts.ownerId },
  });
  if (owns) {
    return {
      ok: false,
      status: 409,
      error: `You already own league **${owns.name}**. Disband it first.`,
    };
  }

  const taken = await prisma.discordLeague.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (taken) {
    return { ok: false, status: 409, error: "That league name is taken" };
  }

  const id = `league_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const row = await prisma.discordLeague.create({
    data: {
      id,
      name,
      ownerId: opts.ownerId,
      memberIds: [],
    },
  });
  return { ok: true, league: toPublic(row) };
}

export async function addDiscordMember(opts: {
  ownerId: string;
  userId: string;
}): Promise<DiscordLeagueMutation> {
  const league = await prisma.discordLeague.findFirst({
    where: { ownerId: opts.ownerId },
  });
  if (!league) {
    return { ok: false, status: 404, error: "You do not own a Discord league" };
  }
  if (opts.userId === league.ownerId) {
    return { ok: false, status: 400, error: "Owner is already in the league" };
  }
  const members = asMemberIds(league.memberIds);
  if (members.includes(opts.userId)) {
    return { ok: false, status: 409, error: "User already in this league" };
  }
  if (members.length >= LEAGUE_MAX_MEMBERS) {
    return {
      ok: false,
      status: 400,
      error: `League is full (${LEAGUE_MAX_MEMBERS}/${LEAGUE_MAX_MEMBERS})`,
    };
  }
  const row = await prisma.discordLeague.update({
    where: { id: league.id },
    data: { memberIds: [...members, opts.userId] },
  });
  return { ok: true, league: toPublic(row) };
}

export async function removeDiscordMember(opts: {
  ownerId: string;
  userId: string;
}): Promise<DiscordLeagueMutation> {
  const league = await prisma.discordLeague.findFirst({
    where: { ownerId: opts.ownerId },
  });
  if (!league) {
    return { ok: false, status: 404, error: "You do not own a Discord league" };
  }
  const members = asMemberIds(league.memberIds);
  if (!members.includes(opts.userId)) {
    return { ok: false, status: 404, error: "User not in this league" };
  }
  const row = await prisma.discordLeague.update({
    where: { id: league.id },
    data: { memberIds: members.filter((id) => id !== opts.userId) },
  });
  return { ok: true, league: toPublic(row) };
}

export async function disbandDiscordLeague(
  ownerId: string,
): Promise<DiscordLeagueMutation> {
  const league = await prisma.discordLeague.findFirst({
    where: { ownerId },
  });
  if (!league) {
    return { ok: false, status: 404, error: "You do not own a Discord league" };
  }
  await prisma.discordLeague.delete({ where: { id: league.id } });
  return { ok: true, league: toPublic(league) };
}

export async function clearAllDiscordLeagues(): Promise<{ cleared: number }> {
  const result = await prisma.discordLeague.deleteMany();
  await prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: { id: "current", additionsOpen: true, summaryMessageId: null },
    update: { summaryMessageId: null },
  });
  return { cleared: result.count };
}

export async function getLeagueChannelConfig() {
  const s = await prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: { id: "current", additionsOpen: true },
    update: {},
  });
  return {
    channelId: s.channelId,
    summaryMessageId: s.summaryMessageId,
    additionsOpen: s.additionsOpen,
  };
}

export async function setLeagueChannel(channelId: string | null) {
  const s = await prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: {
      id: "current",
      additionsOpen: true,
      channelId,
      summaryMessageId: null,
    },
    update: { channelId, summaryMessageId: null },
  });
  return {
    channelId: s.channelId,
    summaryMessageId: s.summaryMessageId,
  };
}

export async function setSummaryMessageId(messageId: string | null) {
  await prisma.leagueSettings.upsert({
    where: { id: "current" },
    create: {
      id: "current",
      additionsOpen: true,
      summaryMessageId: messageId,
    },
    update: { summaryMessageId: messageId },
  });
}
