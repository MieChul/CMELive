-- Migration 017: Track per-user views for keyMoments so each user only counts once.
DROP TABLE IF EXISTS user_km_views;

CREATE TABLE user_km_views (
  id          SERIAL PRIMARY KEY,
  "userId"    VARCHAR(255) NOT NULL,
  "momentId"  INT          NOT NULL,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_km_views UNIQUE ("userId", "momentId"),
  CONSTRAINT fk_user_km_views_moment FOREIGN KEY ("momentId") REFERENCES "keyMoments"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_km_views_userId   ON user_km_views("userId");
CREATE INDEX IF NOT EXISTS idx_user_km_views_momentId ON user_km_views("momentId");
