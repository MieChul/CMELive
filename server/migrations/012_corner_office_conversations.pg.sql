CREATE TABLE IF NOT EXISTS "cornerOfficeConversations" (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500) NOT NULL DEFAULT '',
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "numberColor" VARCHAR(20) NOT NULL DEFAULT '#F2665B',
  "borderColor" VARCHAR(50) NOT NULL DEFAULT 'rgba(89,22,139,0.3)',
  "displayOrder" INT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_cornerOffice_active ON "cornerOfficeConversations"("isActive");
CREATE INDEX IF NOT EXISTS idx_cornerOffice_order ON "cornerOfficeConversations"("displayOrder");
