-- News table for AI-generated / admin-reviewed articles.
-- SQLite already has this table in 001_initial_schema.sqlite.sql.
-- This migration adds it to Azure SQL Server.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'news')
BEGIN
  CREATE TABLE news (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    title       NVARCHAR(500)  NOT NULL,
    excerpt     NVARCHAR(MAX)  NOT NULL,
    category    NVARCHAR(100),
    source      NVARCHAR(255),
    status      NVARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CONSTRAINT CK_news_status CHECK (status IN ('pending', 'approved', 'rejected')),
    publishedDate NVARCHAR(50),
    createdDate DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy   NVARCHAR(100),
    updatedDate DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy   NVARCHAR(100)
  );
  CREATE INDEX idx_news_status        ON news(status);
  CREATE INDEX idx_news_publishedDate ON news(publishedDate);
END
GO
