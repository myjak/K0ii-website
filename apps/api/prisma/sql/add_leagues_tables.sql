CREATE TABLE IF NOT EXISTS "TrackedLeague" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "addedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrackedLeague_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrackedLeague_leagueId_key" ON "TrackedLeague"("leagueId");
CREATE INDEX IF NOT EXISTS "TrackedLeague_name_idx" ON "TrackedLeague"("name");

CREATE TABLE IF NOT EXISTS "LeagueSnapshot" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "points" BIGINT NOT NULL,
  "rank" INTEGER,
  "memberCount" INTEGER,
  "contributorCount" INTEGER,
  CONSTRAINT "LeagueSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeagueSnapshot_leagueId_capturedAt_idx" ON "LeagueSnapshot"("leagueId", "capturedAt" DESC);
CREATE INDEX IF NOT EXISTS "LeagueSnapshot_capturedAt_idx" ON "LeagueSnapshot"("capturedAt" DESC);
