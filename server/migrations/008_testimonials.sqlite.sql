-- Client testimonials shown on the CME Live tab (Customer Signal section).
CREATE TABLE IF NOT EXISTS testimonials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT '',
  message       TEXT NOT NULL,
  imageUrl      TEXT,
  linkedinUrl   TEXT,
  displayOrder  INTEGER NOT NULL DEFAULT 0,
  isActive      INTEGER NOT NULL DEFAULT 1,
  createdDate   TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy     TEXT,
  updatedDate   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy     TEXT
);

CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(isActive);
CREATE INDEX IF NOT EXISTS idx_testimonials_order  ON testimonials(displayOrder);
