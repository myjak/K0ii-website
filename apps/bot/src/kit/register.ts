import { REST, Routes } from "discord.js";

import type { LoadedCommand } from "./types";

export async function registerSlashCommands(opts: {
  token: string;
  clientId: string;
  guildId?: string;
  commands: LoadedCommand[];
}): Promise<void> {
  const body = opts.commands.map((c) => c.data);
  const rest = new REST({ version: "10" }).setToken(opts.token);

  if (opts.guildId) {
    await rest.put(Routes.applicationGuildCommands(opts.clientId, opts.guildId), {
      body,
    });
    console.log(
      `[kit] registered ${body.length} guild command(s) → ${opts.guildId}`,
    );
    return;
  }

  await rest.put(Routes.applicationCommands(opts.clientId), { body });
  console.log(`[kit] registered ${body.length} global command(s)`);
}
