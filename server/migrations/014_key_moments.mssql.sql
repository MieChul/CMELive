-- Mission: AI Possible — Key Moments ingested from the AWS metadata endpoint.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'keyMoments')
BEGIN
  CREATE TABLE keyMoments (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    externalId      NVARCHAR(255),
    title           NVARCHAR(500)  NOT NULL DEFAULT '',
    description     NVARCHAR(MAX)  NOT NULL DEFAULT '',
    category        NVARCHAR(100)  NOT NULL DEFAULT '',
    tags            NVARCHAR(500)  NOT NULL DEFAULT '',
    thumbnailUrl    NVARCHAR(MAX),
    s3Path          NVARCHAR(1000) NOT NULL DEFAULT '',
    remoteVideoUrl  NVARCHAR(MAX)  NOT NULL DEFAULT '',
    localVideoUrl   NVARCHAR(1000),
    durationSeconds INT,
    capturedAt      NVARCHAR(50),
    rawMetadata     NVARCHAR(MAX),
    status          NVARCHAR(20)   NOT NULL DEFAULT 'pending',
    reviewedBy      NVARCHAR(255),
    reviewedAt      DATETIME2,
    fetchedAt       DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    createdDate     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedDate     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX idx_keyMoments_status     ON keyMoments(status);
  CREATE INDEX idx_keyMoments_externalId ON keyMoments(externalId);
  CREATE INDEX idx_keyMoments_fetchedAt  ON keyMoments(fetchedAt);
END
GO
