-- Migration 009: Add engagement counters to news articles
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'news') AND name = N'likes'
)
  ALTER TABLE news ADD likes INT NOT NULL DEFAULT 0;

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'news') AND name = N'views'
)
  ALTER TABLE news ADD views INT NOT NULL DEFAULT 0;
