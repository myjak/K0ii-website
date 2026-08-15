import { z } from "zod";

export const GlobalPlayerSchema = z.object({
  rank: z.number(),
  displayName: z.string(),
  robloxUserId: z.string(),
  clanName: z.string().nullable(),
  points: z.number(),
  isOurs: z.boolean(),
});

export const GlobalLeaderboardResponseSchema = z.object({
  generatedAt: z.number(),
  /** Rows matching current filters (pagination). */
  total: z.number(),
  /** Full index size — use for “better than X%” even when `q`/`clan` filters shrink `total`. */
  universeTotal: z.number().optional(),
  limit: z.number(),
  offset: z.number(),
  players: z.array(GlobalPlayerSchema),
});

export type GlobalPlayer = z.infer<typeof GlobalPlayerSchema>;
export type GlobalLeaderboardResponse = z.infer<typeof GlobalLeaderboardResponseSchema>;
