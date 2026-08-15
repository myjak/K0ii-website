import { Events } from "discord.js";

import type { EventModule } from "../kit/types";

export const event = Events.ClientReady;
export const once = true;

export const execute: EventModule["execute"] = (client) => {
  const c = client as { user?: { tag?: string } | null };
  console.log(`[bot] ready as ${c.user?.tag ?? "unknown"}`);
};
