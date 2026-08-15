import type { Context, Next } from "hono";

import type { Env } from "../env";

/** Require X-Bot-Secret for mutating league routes. */
export function requireBotSecret(env: Env) {
  return async (c: Context, next: Next) => {
    if (!env.BOT_API_SECRET) {
      return c.json(
        { error: "BOT_API_SECRET not configured on API" },
        503,
      );
    }
    const provided = c.req.header("X-Bot-Secret") ?? "";
    if (provided !== env.BOT_API_SECRET) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  };
}
