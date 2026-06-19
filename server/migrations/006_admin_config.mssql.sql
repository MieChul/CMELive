IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'admin_config')
BEGIN
  CREATE TABLE admin_config (
    [key] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX) NOT NULL,
    updatedDate NVARCHAR(50),
    updatedBy NVARCHAR(255)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM admin_config WHERE [key] = 'agent_config')
BEGIN
  INSERT INTO admin_config ([key], [value], updatedDate, updatedBy)
  VALUES (
    'agent_config',
    '{"autoFetch":true,"cronExpression":"0 8 * * *","maxPerBatch":5,"minAiScore":50,"enableImages":false,"sources":{"newsapi":true,"techcrunch":true,"mitTechReview":true,"ventureBeat":true,"theVerge":true,"wired":true},"categories":["AI Research","Industry News","Products & Tools","Policy & Ethics","Science","Business"],"keywords":["artificial intelligence","machine learning","LLM","GPT","neural network","deep learning"]}',
    CONVERT(NVARCHAR(50), GETUTCDATE(), 127),
    'system'
  );
END
GO
