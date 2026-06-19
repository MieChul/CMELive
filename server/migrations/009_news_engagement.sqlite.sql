-- Migration 009: Add engagement counters to news articles
ALTER TABLE news ADD COLUMN likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
