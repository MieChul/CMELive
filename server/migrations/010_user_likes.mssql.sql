-- Create user_likes table to track per-user article likes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE id = object_id(N'user_likes') AND OBJECTPROPERTY(id, N'IsUserTable') = 1)
BEGIN
  CREATE TABLE user_likes (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId NVARCHAR(255) NOT NULL,
    newsId INT NOT NULL,
    createdDate DATETIME NOT NULL DEFAULT GETDATE(),
    UNIQUE(userId, newsId),
    FOREIGN KEY(newsId) REFERENCES news(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_user_likes_userId ON user_likes(userId);
  CREATE INDEX idx_user_likes_newsId ON user_likes(newsId);
END;
