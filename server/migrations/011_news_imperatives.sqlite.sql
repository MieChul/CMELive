-- Add domain/AI tech imperative sections and share tracking to news
ALTER TABLE news ADD COLUMN domainImperative TEXT;
ALTER TABLE news ADD COLUMN aiTechImperative TEXT;
ALTER TABLE news ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;
