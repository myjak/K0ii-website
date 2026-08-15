CREATE TABLE IF NOT EXISTS "LeagueSettings" (
  "id" TEXT NOT NULL,
  "additionsOpen" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeagueSettings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "LeagueSettings" ("id", "additionsOpen", "updatedAt")
VALUES ('current', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
