import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { ApiError } from "../api/errors";
import type { ChatInputHandler } from "../kit/types";

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export const command = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Clan war status from the K0ii API");

export const chatInput: ChatInputHandler = async (ctx) => {
  await ctx.interaction.deferReply();

  try {
    const roster = await ctx.api.roster();
    const battle = roster.battle;
    const live = Boolean(battle?.live);

    const embed = new EmbedBuilder()
      .setTitle(`${roster.clanName} — war status`)
      .setColor(live ? 0xe8801f : 0x2e96a8)
      .setDescription(
        live
          ? "Live battle snapshot from `apps/api`."
          : battle
            ? "Last battle snapshot (not live)."
            : "No battle snapshot yet.",
      )
      .addFields(
        {
          name: "Rank",
          value: battle?.rank != null ? `#${battle.rank}` : "—",
          inline: true,
        },
        {
          name: "Points",
          value: fmt(battle?.points),
          inline: true,
        },
        {
          name: "PPH",
          value: fmt(battle?.pph),
          inline: true,
        },
        {
          name: "Members",
          value: fmt(battle?.memberCount ?? roster.members.length),
          inline: true,
        },
        {
          name: "State",
          value: live ? "Live" : battle ? "Ended / idle" : "Waiting",
          inline: true,
        },
      )
      .setFooter({
        text: `API · generated ${new Date(roster.generatedAt).toISOString()}`,
      });

    await ctx.interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const detail =
      err instanceof ApiError
        ? err.status === 0
          ? `API unreachable (\`${err.path}\`). Is \`apps/api\` running?`
          : `API \`${err.path}\` returned ${err.status}.`
        : err instanceof Error
          ? err.message
          : "Failed to load roster.";

    await ctx.interaction.editReply({ content: detail });
  }
};
