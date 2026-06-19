-- Renumber any duplicate displayOrder rows (keep smallest id, bump the rest)
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "displayOrder" ORDER BY id) AS rn
    FROM "cornerOfficeConversations"
)
UPDATE "cornerOfficeConversations" c
   SET "displayOrder" = c.id + 1000
  FROM dupes d
 WHERE d.id = c.id AND d.rn > 1;

DROP INDEX IF EXISTS idx_cornerOffice_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cornerOffice_order_unique
  ON "cornerOfficeConversations"("displayOrder");
