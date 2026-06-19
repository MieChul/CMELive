IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'url')
BEGIN
  ALTER TABLE news ADD url NVARCHAR(2048);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'imageUrl')
BEGIN
  ALTER TABLE news ADD imageUrl NVARCHAR(1000);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'imageAlt')
BEGIN
  ALTER TABLE news ADD imageAlt NVARCHAR(500);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'tags')
BEGIN
  ALTER TABLE news ADD tags NVARCHAR(500);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'summary')
BEGIN
  ALTER TABLE news ADD summary NVARCHAR(MAX);
END
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_news_url' AND object_id = OBJECT_ID(N'dbo.news')
)
BEGIN
  CREATE UNIQUE INDEX idx_news_url ON news(url) WHERE url IS NOT NULL;
END
GO
