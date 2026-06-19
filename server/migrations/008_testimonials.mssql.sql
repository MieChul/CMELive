-- Client testimonials shown on the CME Live tab (Customer Signal section).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'testimonials')
BEGIN
  CREATE TABLE testimonials (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(255) NOT NULL,
    role          NVARCHAR(255) NOT NULL DEFAULT '',
    message       NVARCHAR(MAX) NOT NULL,
    imageUrl      NVARCHAR(MAX),
    linkedinUrl   NVARCHAR(500),
    displayOrder  INT NOT NULL DEFAULT 0,
    isActive      BIT NOT NULL DEFAULT 1,
    createdDate   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy     NVARCHAR(100),
    updatedDate   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy     NVARCHAR(100)
  );
  CREATE INDEX idx_testimonials_active ON testimonials(isActive);
  CREATE INDEX idx_testimonials_order  ON testimonials(displayOrder);
END
GO
