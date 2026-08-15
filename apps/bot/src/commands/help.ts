import { SlashCommandBuilder } from "discord.js";

import type { ChatInputHandler } from "../kit/types";

export const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List available slash commands");

export const chatInput: ChatInputHandler = async (ctx) => {
  const lines = [...ctx.commands.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, desc]) => `\`/${name}\` — ${desc || "No description"}`);

  await ctx.interaction.reply({
    content:
      lines.length > 0
        ? `**Commands**\n${lines.join("\n")}`
        : "No commands loaded.",
    ephemeral: true,
  });
};
