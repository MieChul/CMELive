-- Create user_likes table to track per-user article likes
CREATE TABLE IF NOT EXISTS user_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  newsId INTEGER NOT NULL,
  createdDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, newsId),
  FOREIGN KEY(newsId) REFERENCES news(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_likes_userId ON user_likes(userId);
CREATE INDEX IF NOT EXISTS idx_user_likes_newsId ON user_likes(newsId);
