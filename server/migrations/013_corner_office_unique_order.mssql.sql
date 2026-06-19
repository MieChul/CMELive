-- Enforce unique displayOrder for Corner Office conversations.

-- Renumber any duplicate displayOrder rows (keep the smallest id, bump the rest).
;WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY displayOrder ORDER BY id) AS rn
    FROM cornerOfficeConversations
)
UPDATE c
   SET displayOrder = c.id + 1000
  FROM cornerOfficeConversations c
  JOIN dupes d ON d.id = c.id
 WHERE d.rn > 1;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_cornerOffice_order')
  DROP INDEX idx_cornerOffice_order ON cornerOfficeConversations;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_cornerOffice_order_unique')
  CREATE UNIQUE INDEX idx_cornerOffice_order_unique
    ON cornerOfficeConversations(displayOrder);
GO
