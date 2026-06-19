-- Migration 016: Add engagement counters and per-user like tracking to keyMoments
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'keyMoments') AND name = N'views')
  ALTER TABLE keyMoments ADD views  INT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'keyMoments') AND name = N'likes')
  ALTER TABLE keyMoments ADD likes  INT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'keyMoments') AND name = N'shares')
  ALTER TABLE keyMoments ADD shares INT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_km_likes')
BEGIN
  CREATE TABLE user_km_likes (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    userId      NVARCHAR(255) NOT NULL,
    momentId    INT           NOT NULL,
    createdDate DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_user_km_likes UNIQUE (userId, momentId),
    CONSTRAINT fk_user_km_likes_moment FOREIGN KEY (momentId) REFERENCES keyMoments(id) ON DELETE CASCADE
  );
  CREATE INDEX idx_user_km_likes_userId   ON user_km_likes(userId);
  CREATE INDEX idx_user_km_likes_momentId ON user_km_likes(momentId);
END
GO
