import { join } from "node:path";

import type { MiddlewareModule } from "./types";

function isMiddlewareModule(mod: unknown): mod is MiddlewareModule {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return typeof m.before === "function" || typeof m.after === "function";
}

export async function loadMiddleware(dir: string): Promise<MiddlewareModule[]> {
  const glob = new Bun.Glob("**/*.ts");
  const files: string[] = [];

  for await (const rel of glob.scan({ cwd: dir, onlyFiles: true })) {
    if (rel.endsWith(".test.ts")) continue;
    files.push(rel);
  }

  files.sort((a, b) => a.localeCompare(b));
  const loaded: MiddlewareModule[] = [];

  for (const rel of files) {
    const full = join(dir, rel);
    const mod = await import(full);
    if (!isMiddlewareModule(mod)) {
      console.warn(`[kit] skip middleware file (missing exports): ${rel}`);
      continue;
    }
    loaded.push({
      before: typeof mod.before === "function" ? mod.before : undefined,
      after: typeof mod.after === "function" ? mod.after : undefined,
    });
  }

  return loaded;
}
