-- Enforce unique displayOrder for Corner Office conversations.
-- Renumber any rows that share an order to use their id as a fallback,
-- then drop the old non-unique index and create a unique one.

-- Renumber duplicates: for each id, if another row already has the same
-- displayOrder with a smaller id, bump this row's order to its own id (offset by 1000)
-- to avoid colliding with sequential numbering. Safe because new table is small.
UPDATE cornerOfficeConversations
   SET displayOrder = id + 1000
 WHERE id IN (
   SELECT a.id
     FROM cornerOfficeConversations a
     JOIN cornerOfficeConversations b
       ON b.displayOrder = a.displayOrder AND b.id < a.id
 );

DROP INDEX IF EXISTS idx_cornerOffice_order;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cornerOffice_order_unique
  ON cornerOfficeConversations(displayOrder);
