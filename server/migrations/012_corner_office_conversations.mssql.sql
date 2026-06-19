-- Corner Office Conversations shown on the homepage Corner Office section.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'cornerOfficeConversations')
BEGIN
  CREATE TABLE cornerOfficeConversations (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    title         NVARCHAR(255) NOT NULL,
    subtitle      NVARCHAR(500) NOT NULL DEFAULT '',
    imageUrl      NVARCHAR(MAX),
    videoUrl      NVARCHAR(MAX),
    numberColor   NVARCHAR(20)  NOT NULL DEFAULT '#F2665B',
    borderColor   NVARCHAR(50)  NOT NULL DEFAULT 'rgba(89,22,139,0.3)',
    displayOrder  INT  NOT NULL DEFAULT 0,
    isActive      BIT  NOT NULL DEFAULT 1,
    createdDate   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy     NVARCHAR(100),
    updatedDate   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy     NVARCHAR(100)
  );
  CREATE INDEX idx_cornerOffice_active ON cornerOfficeConversations(isActive);
  CREATE INDEX idx_cornerOffice_order  ON cornerOfficeConversations(displayOrder);
END
GO
