import { SlashCommandBuilder } from "discord.js";

import type { ChatInputHandler } from "../kit/types";

export const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check bot latency");

export const chatInput: ChatInputHandler = async (ctx) => {
  const sent = await ctx.interaction.reply({
    content: "Pinging…",
    fetchReply: true,
  });
  const roundTrip =
    sent.createdTimestamp - ctx.interaction.createdTimestamp;
  const ws = ctx.client.ws.ping;
  await ctx.interaction.editReply(
    `Pong. Round-trip **${roundTrip}ms** · WS **${ws}ms**`,
  );
};
