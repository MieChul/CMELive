-- Add isAdmin flag to users table.
-- Synced from Azure AD App Role ('Admin') on every SSO login.
-- For local dev, controlled via ADMIN_EMAILS env var.
ALTER TABLE users ADD COLUMN isAdmin INTEGER NOT NULL DEFAULT 0;
