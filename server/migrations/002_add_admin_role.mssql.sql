-- Add isAdmin flag to users table.
-- Synced from Azure AD App Role ('Admin') on every SSO login.
-- For local dev, controlled via ADMIN_EMAILS env var.
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.users') AND name = N'isAdmin'
)
BEGIN
  ALTER TABLE users ADD isAdmin BIT NOT NULL DEFAULT 0;
END
GO
