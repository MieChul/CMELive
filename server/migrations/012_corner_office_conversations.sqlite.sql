-- Corner Office Conversations shown on the homepage Corner Office section.
CREATE TABLE IF NOT EXISTS cornerOfficeConversations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  subtitle      TEXT NOT NULL DEFAULT '',
  imageUrl      TEXT,
  videoUrl      TEXT,
  numberColor   TEXT NOT NULL DEFAULT '#F2665B',
  borderColor   TEXT NOT NULL DEFAULT 'rgba(89,22,139,0.3)',
  displayOrder  INTEGER NOT NULL DEFAULT 0,
  isActive      INTEGER NOT NULL DEFAULT 1,
  createdDate   TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy     TEXT,
  updatedDate   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy     TEXT
);

CREATE INDEX IF NOT EXISTS idx_cornerOffice_active ON cornerOfficeConversations(isActive);
CREATE INDEX IF NOT EXISTS idx_cornerOffice_order  ON cornerOfficeConversations(displayOrder);
