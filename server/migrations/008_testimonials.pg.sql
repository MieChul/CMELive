CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  "imageUrl" TEXT,
  "linkedinUrl" VARCHAR(500),
  "displayOrder" INT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials("isActive");
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials("displayOrder");
