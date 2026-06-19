-- Migration 016: Add engagement counters and per-user like tracking to keyMoments
ALTER TABLE keyMoments ADD COLUMN views  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE keyMoments ADD COLUMN likes  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE keyMoments ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_km_likes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      TEXT    NOT NULL,
  momentId    INTEGER NOT NULL,
  createdDate TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, momentId),
  FOREIGN KEY(momentId) REFERENCES keyMoments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_km_likes_userId   ON user_km_likes(userId);
CREATE INDEX IF NOT EXISTS idx_user_km_likes_momentId ON user_km_likes(momentId);
