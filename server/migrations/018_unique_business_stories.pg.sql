CREATE TABLE IF NOT EXISTS uniqueBusinessStories (
  id            SERIAL PRIMARY KEY,
  heading       VARCHAR(255) NOT NULL,
  subheading    VARCHAR(500) NOT NULL DEFAULT '',
  domain        VARCHAR(120) NOT NULL DEFAULT '',
  "imageUrl"    TEXT,
  "displayOrder" INT NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy"   VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy"   VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_ubs_active ON uniqueBusinessStories("isActive");
CREATE INDEX IF NOT EXISTS idx_ubs_order  ON uniqueBusinessStories("displayOrder");
