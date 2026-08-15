import { z } from "zod";

export const LeagueContributorSchema = z.object({
  robloxUserId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  points: z.number(),
  sharePct: z.number().nullable().optional(),
});

export const LeagueEntrySchema = z.object({
  name: z.string(),
  rank: z.number().nullable(),
  points: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  delta30m: z.number().nullable().optional(),
  delta60m: z.number().nullable().optional(),
  contributorCount: z.number().nullable(),
  isOurs: z.boolean(),
  pending: z.boolean().optional(),
  source: z.enum(["discord", "pinned", "auto"]).optional(),
  /** PS99 point contributions when detail was polled. */
  contributions: z.array(LeagueContributorSchema).optional(),
  memberCount: z.number().nullable().optional(),
});

export const DiscordLeagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  memberIds: z.array(z.string()),
  createdAt: z.number(),
  capacity: z.number().default(3),
});

export const LeaguesResponseSchema = z.object({
  generatedAt: z.number(),
  tracked: z.array(LeagueEntrySchema),
  top100: z.array(LeagueEntrySchema),
  discordLeagues: z.array(DiscordLeagueSchema).optional(),
  historyLength: z.number().optional(),
  additionsOpen: z.boolean().optional(),
});

export const TrackedLeagueItemSchema = z.object({
  leagueId: z.string(),
  name: z.string(),
  addedBy: z.string().nullable().optional(),
  createdAt: z.number(),
  pending: z.boolean().optional(),
});

export const TrackedLeaguesResponseSchema = z.object({
  generatedAt: z.number(),
  additionsOpen: z.boolean(),
  tracked: z.array(TrackedLeagueItemSchema),
});

export const AddTrackedLeagueBodySchema = z.object({
  name: z.string().min(1).max(64),
  addedBy: z.string().max(64).optional(),
});

export const LeagueSettingsResponseSchema = z.object({
  additionsOpen: z.boolean(),
  channelId: z.string().nullable().optional(),
  summaryMessageId: z.string().nullable().optional(),
  updatedAt: z.number().optional(),
});

export const SetLeagueAdditionsBodySchema = z.object({
  open: z.boolean().optional(),
});

export const SetLeagueChannelBodySchema = z.object({
  channelId: z.string().min(1).nullable(),
});

export const ClearTrackedLeaguesResponseSchema = z.object({
  ok: z.literal(true),
  cleared: z.number(),
});

export const CreateDiscordLeagueBodySchema = z.object({
  name: z.string().min(1).max(32),
  ownerId: z.string().min(1),
});

export const DiscordMemberBodySchema = z.object({
  ownerId: z.string().min(1),
  userId: z.string().min(1),
});

export const DiscordLeaguesResponseSchema = z.object({
  generatedAt: z.number(),
  leagues: z.array(DiscordLeagueSchema),
});

export const LeagueDetailResponseSchema = z.object({
  generatedAt: z.number(),
  name: z.string(),
  rank: z.number().nullable(),
  points: z.number().nullable(),
  pph: z.number().nullable(),
  delta5m: z.number().nullable(),
  contributorCount: z.number().nullable(),
  memberCount: z.number().nullable(),
  isOurs: z.boolean(),
  pending: z.boolean().optional(),
  contributions: z.array(LeagueContributorSchema),
  discord: DiscordLeagueSchema.nullable().optional(),
});

export type LeagueContributor = z.infer<typeof LeagueContributorSchema>;
export type LeagueEntry = z.infer<typeof LeagueEntrySchema>;
export type DiscordLeague = z.infer<typeof DiscordLeagueSchema>;
export type LeaguesResponse = z.infer<typeof LeaguesResponseSchema>;
export type LeagueDetailResponse = z.infer<typeof LeagueDetailResponseSchema>;
export type TrackedLeagueItem = z.infer<typeof TrackedLeagueItemSchema>;
export type TrackedLeaguesResponse = z.infer<
  typeof TrackedLeaguesResponseSchema
>;
export type AddTrackedLeagueBody = z.infer<typeof AddTrackedLeagueBodySchema>;
export type LeagueSettingsResponse = z.infer<
  typeof LeagueSettingsResponseSchema
>;
export type SetLeagueAdditionsBody = z.infer<
  typeof SetLeagueAdditionsBodySchema
>;
export type ClearTrackedLeaguesResponse = z.infer<
  typeof ClearTrackedLeaguesResponseSchema
>;
