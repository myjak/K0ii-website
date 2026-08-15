import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  /** Base URL for apps/api — bot never talks to PS99 directly. */
  API_BASE_URL: z
    .string()
    .default("http://localhost:3002")
    .transform((s) => s.replace(/\/$/, "")),
  /** Same secret as apps/api BOT_API_SECRET — required for league writes. */
  BOT_API_SECRET: z.string().min(1).optional(),
  /** Default league channel; API channel override wins when set. */
  LEAGUE_CHANNEL_ID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid bot environment configuration");
  }
  return parsed.data;
}
