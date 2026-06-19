CREATE TABLE IF NOT EXISTS "keyMoments" (
  id SERIAL PRIMARY KEY,
  "externalId" VARCHAR(255),
  title VARCHAR(500) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT '',
  tags VARCHAR(500) NOT NULL DEFAULT '',
  "thumbnailUrl" TEXT,
  "s3Path" VARCHAR(1000) NOT NULL DEFAULT '',
  "remoteVideoUrl" TEXT NOT NULL DEFAULT '',
  "localVideoUrl" VARCHAR(1000),
  "durationSeconds" INT,
  "capturedAt" VARCHAR(50),
  "rawMetadata" TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "reviewedBy" VARCHAR(255),
  "reviewedAt" TIMESTAMPTZ,
  "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_keyMoments_status ON "keyMoments"(status);
CREATE INDEX IF NOT EXISTS idx_keyMoments_externalId ON "keyMoments"("externalId");
CREATE INDEX IF NOT EXISTS idx_keyMoments_fetchedAt ON "keyMoments"("fetchedAt");
