-- Migration 008: Add feedType to distinguish AI news from general Trends news
-- feedType: 'ai' (default, existing AI/media feed) | 'trends' (general world news)
ALTER TABLE news ADD COLUMN IF NOT EXISTS "feedType" VARCHAR(20) NOT NULL DEFAULT 'ai';
CREATE INDEX IF NOT EXISTS idx_news_feedType ON news("feedType");
