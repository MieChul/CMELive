-- Migration 007: Add multi-image support for news articles
ALTER TABLE news ADD images NVARCHAR(MAX);
