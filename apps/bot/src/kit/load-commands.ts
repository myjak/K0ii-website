import { join } from "node:path";

import type { CommandModule, LoadedCommand } from "./types";
import { toCommandJson } from "./types";

function isCommandModule(mod: unknown): mod is CommandModule {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return "command" in m && typeof m.chatInput === "function";
}

export async function loadCommands(dir: string): Promise<LoadedCommand[]> {
  const glob = new Bun.Glob("**/*.ts");
  const loaded: LoadedCommand[] = [];

  for await (const rel of glob.scan({ cwd: dir, onlyFiles: true })) {
    if (rel.endsWith(".test.ts")) continue;
    const full = join(dir, rel);
    const mod = (await import(full)) as CommandModule;
    if (!isCommandModule(mod)) {
      console.warn(`[kit] skip command file (missing exports): ${rel}`);
      continue;
    }
    const data = toCommandJson(mod.command);
    if (!data.name) {
      console.warn(`[kit] skip command file (no name): ${rel}`);
      continue;
    }
    loaded.push({
      name: data.name,
      description: data.description ?? "",
      data,
      chatInput: mod.chatInput,
    });
  }

  loaded.sort((a, b) => a.name.localeCompare(b.name));
  return loaded;
}
