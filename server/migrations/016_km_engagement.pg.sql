ALTER TABLE "keyMoments" ADD COLUMN IF NOT EXISTS views INT NOT NULL DEFAULT 0;
ALTER TABLE "keyMoments" ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0;
ALTER TABLE "keyMoments" ADD COLUMN IF NOT EXISTS shares INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_km_likes (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "momentId" INT NOT NULL,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_km_likes UNIQUE ("userId", "momentId"),
  CONSTRAINT fk_user_km_likes_moment FOREIGN KEY ("momentId") REFERENCES "keyMoments"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_km_likes_userId ON user_km_likes("userId");
CREATE INDEX IF NOT EXISTS idx_user_km_likes_momentId ON user_km_likes("momentId");
