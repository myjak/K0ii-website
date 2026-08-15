import {
  AttachmentBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { GlobalPlayer, RosterMember, RosterResponse } from "@k0ii/schemas";

import { ApiError } from "../api/errors";
import type { ApiClient } from "../api/client";
import type { ChatInputHandler } from "../kit/types";
import { escapeMd, fmtCompact } from "../lib/format";
import { renderPlayerPphChart } from "../lib/player-chart";
import { derivePphSeries, pphStats } from "../lib/pph-series";
import { findMember, matchSuggestions } from "../lib/roster-lookup";

export const command = new SlashCommandBuilder()
  .setName("player")
  .setDescription("Look up a roster player's war stats")
  .addStringOption((opt) =>
    opt
      .setName("username")
      .setDescription("Roblox display name or user id on the clan roster")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(64),
  );

function comparisonLine(global: GlobalPlayer | null, universeTotal: number): string {
  if (!global || universeTotal <= 1) return "💠 —";
  const betterThan = ((universeTotal - global.rank) / universeTotal) * 100;
  const worseThan = ((global.rank - 1) / universeTotal) * 100;
  return `💠 Better than **${betterThan.toFixed(2)}%** of players; **${Math.max(0, worseThan).toFixed(2)}%** are better`;
}

export async function buildPlayerCard(opts: {
  api: ApiClient;
  roster: RosterResponse;
  member: RosterMember;
}): Promise<{
  embeds: EmbedBuilder[];
  files: AttachmentBuilder[];
  content?: string;
}> {
  const { roster, member } = opts;
  const battle = roster.battle;
  const live = Boolean(battle?.live);
  const memberCount = battle?.memberCount ?? roster.members.length;
  const eventTitle = battle?.title ?? null;
  const name = escapeMd(member.displayName);
  const clan = escapeMd(roster.clanName);
  const event = eventTitle ? escapeMd(eventTitle) : "—";

  const globalRes = await (async () => {
    try {
      return await opts.api.globalLeaderboard({
        q: member.robloxUserId,
        limit: 5,
      });
    } catch {
      return null;
    }
  })();

  const global =
    globalRes?.players.find((p) => p.robloxUserId === member.robloxUserId) ??
    null;
  const universeTotal =
    globalRes?.universeTotal ?? globalRes?.total ?? 0;

  const pointsSeries = (member.series ?? [])
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp);
  const pphSeries = derivePphSeries(pointsSeries);
  const windowStart = roster.generatedAt - 24 * 3_600_000;
  const pph24h = pphSeries.filter(
    (p) => p.timestamp >= windowStart && p.timestamp <= roster.generatedAt,
  );
  const stats = pphStats(pph24h);
  // CW chart TOTAL = 24h points gained (not war Stars).
  const total24h =
    member.delta24h != null && member.delta24h >= 0 ? member.delta24h : null;

  const clanRank =
    member.rank != null
      ? `${member.rank}/${memberCount}`
      : `—/${memberCount}`;

  const globalRankLine =
    global != null && universeTotal > 0
      ? `🏆 **Global Rank:** **#${global.rank}** of ${fmtCompact(universeTotal)}`
      : "🏆 **Global Rank:** —";

  // Layout matches CW-Bot: identity block, blank line, war stats block.
  const description = [
    `👱 **Name:** **${name}**`,
    `🏰 **Clan:** **${clan}**`,
    `🔰 **Clan Rank:** **${clanRank}**`,
    ``,
    `🎉 **Event:** **${event}**`,
    `⭐ **Stars:** **${fmtCompact(member.battlePoints)}** ⭐`,
    globalRankLine,
    comparisonLine(global, universeTotal),
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Global Search Results")
    .setColor(0x5ba8e8)
    .setDescription(description);

  if (member.avatarUrl) {
    embed.setThumbnail(member.avatarUrl);
  }

  const files: AttachmentBuilder[] = [];
  try {
    const chartPng = await renderPlayerPphChart({
      displayName: member.displayName,
      clanName: roster.clanName,
      eventTitle,
      totalPoints: total24h,
      avgPph: stats.avg,
      bestPph: stats.best,
      latestPph: stats.latest,
      pphSeries: pph24h,
      updatedAt: roster.generatedAt,
      avatarUrl: member.avatarUrl,
    });
    const file = new AttachmentBuilder(chartPng, { name: "player-chart.png" });
    files.push(file);
    embed.setImage("attachment://player-chart.png");
  } catch (err) {
    console.error("[player] chart render failed", err);
  }

  const content = live
    ? undefined
    : battle
      ? "This data is no longer updated because the Clan War is over."
      : "Waiting for the next battle snapshot.";

  return {
    embeds: [embed],
    files,
    content,
  };
}

export const chatInput: ChatInputHandler = async (ctx) => {
  const username = ctx.interaction.options.getString("username", true);
  await ctx.interaction.deferReply();

  try {
    const roster = await ctx.api.roster();
    const member = findMember(roster.members, username);

    if (!member) {
      const suggestions = matchSuggestions(roster.members, username);
      const hint =
        suggestions.length > 0
          ? `\nDid you mean: ${suggestions.map((n) => `\`${escapeMd(n)}\``).join(", ")}`
          : "";
      await ctx.interaction.editReply({
        content: `No roster member matched \`${escapeMd(username)}\`.${hint}`,
      });
      return;
    }

    const card = await buildPlayerCard({
      api: ctx.api,
      roster,
      member,
    });

    await ctx.interaction.editReply({
      content: card.content,
      embeds: card.embeds,
      files: card.files,
      components: [],
    });
  } catch (err) {
    const detail =
      err instanceof ApiError
        ? err.status === 0
          ? `API unreachable (\`${err.path}\`). Is \`apps/api\` running?`
          : `API \`${err.path}\` returned ${err.status}.`
        : err instanceof Error
          ? err.message
          : "Failed to load player stats.";

    await ctx.interaction.editReply({ content: detail });
  }
};
