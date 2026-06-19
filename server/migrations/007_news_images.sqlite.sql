-- Migration 007: Add multi-image support for news articles
-- images: JSON array of { url, alt, isDefault, source }
ALTER TABLE news ADD COLUMN images TEXT;
