import type {
  ChatInputCommandInteraction,
  Client,
  Interaction,
} from "discord.js";

import type { ApiClient } from "../api/client";
import type { CommandContext, LoadedCommand, MiddlewareModule } from "./types";

export function createInteractionRouter(opts: {
  client: Client;
  api: ApiClient;
  commands: Map<string, LoadedCommand>;
  middleware: MiddlewareModule[];
  commandIndex: ReadonlyMap<string, string>;
}) {
  return async function routeInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const cmd = opts.commands.get(interaction.commandName);
    if (!cmd) {
      if (interaction.deferred || interaction.replied) return;
      await interaction.reply({
        content: `Unknown command \`${interaction.commandName}\`.`,
        ephemeral: true,
      });
      return;
    }

    const ctx: CommandContext = {
      interaction: interaction as ChatInputCommandInteraction,
      client: opts.client,
      api: opts.api,
      commands: opts.commandIndex,
    };

    for (const mw of opts.middleware) {
      if (!mw.before) continue;
      const result = await mw.before(ctx);
      if (result === false) return;
    }

    try {
      await cmd.chatInput(ctx);
    } catch (err) {
      console.error(`[kit] command /${cmd.name} failed`, err);
      const message =
        err instanceof Error ? err.message : "Command failed unexpectedly.";
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: message, ephemeral: true });
        } else {
          await interaction.reply({ content: message, ephemeral: true });
        }
      } catch {
        /* ignore reply failures */
      }
    }

    for (const mw of opts.middleware) {
      if (!mw.after) continue;
      try {
        await mw.after(ctx);
      } catch (err) {
        console.error(`[kit] after middleware failed`, err);
      }
    }
  };
}
