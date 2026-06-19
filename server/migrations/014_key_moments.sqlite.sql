-- Mission: AI Possible — Key Moments ingested from the AWS metadata endpoint.
CREATE TABLE IF NOT EXISTS keyMoments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  externalId      TEXT,                -- id returned by the upstream metadata feed (dedupe key)
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  tags            TEXT NOT NULL DEFAULT '',
  thumbnailUrl    TEXT,
  s3Path          TEXT NOT NULL DEFAULT '',
  remoteVideoUrl  TEXT NOT NULL DEFAULT '',
  localVideoUrl   TEXT,                -- /assets/key-moments/<file>
  durationSeconds INTEGER,
  capturedAt      TEXT,                -- ISO timestamp from metadata, if any
  rawMetadata     TEXT,                -- full upstream JSON for the item
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewedBy      TEXT,
  reviewedAt      TEXT,
  fetchedAt       TEXT NOT NULL DEFAULT (datetime('now')),
  createdDate     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedDate     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keyMoments_status      ON keyMoments(status);
CREATE INDEX IF NOT EXISTS idx_keyMoments_externalId  ON keyMoments(externalId);
CREATE INDEX IF NOT EXISTS idx_keyMoments_fetchedAt   ON keyMoments(fetchedAt);
