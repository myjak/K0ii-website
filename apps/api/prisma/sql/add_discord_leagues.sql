ALTER TABLE "LeagueSnapshot" ADD COLUMN IF NOT EXISTS "memberPointsJson" JSONB;
ALTER TABLE "LeagueSettings" ADD COLUMN IF NOT EXISTS "channelId" TEXT;
ALTER TABLE "LeagueSettings" ADD COLUMN IF NOT EXISTS "summaryMessageId" TEXT;

CREATE TABLE IF NOT EXISTS "DiscordLeague" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "memberIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscordLeague_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DiscordLeague_name_key" ON "DiscordLeague"("name");
CREATE INDEX IF NOT EXISTS "DiscordLeague_ownerId_idx" ON "DiscordLeague"("ownerId");
