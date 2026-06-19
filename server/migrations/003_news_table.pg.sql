CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT NOT NULL,
  category VARCHAR(100),
  source VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CONSTRAINT ck_news_status CHECK (status IN ('pending', 'approved', 'rejected')),
  "publishedDate" VARCHAR(50),
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_publishedDate ON news("publishedDate");
