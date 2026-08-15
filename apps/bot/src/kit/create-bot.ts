import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { join } from "node:path";

import { createApiClient, type ApiClient } from "../api/client";
import type { Env } from "../env";
import { loadCommands } from "./load-commands";
import { loadEvents } from "./load-events";
import { loadMiddleware } from "./middleware";
import { registerSlashCommands } from "./register";
import { createInteractionRouter } from "./router";
import type { LoadedCommand } from "./types";

export type BotRuntime = {
  client: Client;
  api: ApiClient;
  commands: Map<string, LoadedCommand>;
};

export async function createBot(
  env: Env,
  rootDir: string,
): Promise<BotRuntime> {
  const api = createApiClient(env.API_BASE_URL, env.BOT_API_SECRET);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
  });

  const commandsDir = join(rootDir, "commands");
  const eventsDir = join(rootDir, "events");
  const middlewareDir = join(rootDir, "middleware");

  const loadedCommands = await loadCommands(commandsDir);
  const commands = new Map(loadedCommands.map((c) => [c.name, c]));
  const commandIndex = new Map(
    loadedCommands.map((c) => [c.name, c.description] as const),
  );
  const middleware = await loadMiddleware(middlewareDir);
  const events = await loadEvents(eventsDir);

  const route = createInteractionRouter({
    client,
    api,
    commands,
    middleware,
    commandIndex,
  });

  for (const ev of events) {
    // Kit router owns interactionCreate — skip duplicate event modules.
    if (
      ev.event === "interactionCreate" ||
      ev.event === Events.InteractionCreate
    ) {
      continue;
    }
    const handler = (...args: unknown[]) => ev.execute(...args);
    if (ev.once) client.once(ev.event, handler);
    else client.on(ev.event, handler);
  }

  // Always route interactions through the kit (event file can also listen).
  client.on("interactionCreate", (interaction) => {
    void route(interaction);
  });

  await registerSlashCommands({
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.DISCORD_GUILD_ID,
    commands: loadedCommands,
  });

  await client.login(env.DISCORD_TOKEN);

  return { client, api, commands };
}
