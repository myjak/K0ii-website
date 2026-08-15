import { join } from "node:path";

import type { EventModule } from "./types";

function isEventModule(mod: unknown): mod is EventModule {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return typeof m.event === "string" && typeof m.execute === "function";
}

export async function loadEvents(dir: string): Promise<EventModule[]> {
  const glob = new Bun.Glob("**/*.ts");
  const loaded: EventModule[] = [];

  for await (const rel of glob.scan({ cwd: dir, onlyFiles: true })) {
    if (rel.endsWith(".test.ts")) continue;
    const full = join(dir, rel);
    const mod = await import(full);
    if (!isEventModule(mod)) {
      console.warn(`[kit] skip event file (missing exports): ${rel}`);
      continue;
    }
    loaded.push({
      event: mod.event,
      once: mod.once,
      execute: mod.execute,
    });
  }

  return loaded;
}
