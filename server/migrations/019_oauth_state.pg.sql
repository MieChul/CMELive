CREATE TABLE IF NOT EXISTS oauth_state (
  id          SERIAL       PRIMARY KEY,
  state       VARCHAR(64)  NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_state_created ON oauth_state ("createdAt");
