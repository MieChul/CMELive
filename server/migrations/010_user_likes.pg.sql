CREATE TABLE IF NOT EXISTS user_likes (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "newsId" INT NOT NULL,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "newsId"),
  FOREIGN KEY("newsId") REFERENCES news(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_likes_userId ON user_likes("userId");
CREATE INDEX IF NOT EXISTS idx_user_likes_newsId ON user_likes("newsId");
