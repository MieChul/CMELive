IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'aiScore')
BEGIN ALTER TABLE news ADD aiScore INT DEFAULT 0; END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.news') AND name = N'batchId')
BEGIN ALTER TABLE news ADD batchId NVARCHAR(100); END
GO
