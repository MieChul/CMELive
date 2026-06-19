CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedDate TEXT,
  updatedBy TEXT
);

INSERT OR IGNORE INTO admin_config (key, value, updatedDate, updatedBy)
VALUES (
  'agent_config',
  '{"autoFetch":true,"cronExpression":"0 8 * * *","maxPerBatch":5,"minAiScore":50,"enableImages":false,"sources":{"newsapi":true,"techcrunch":true,"mitTechReview":true,"ventureBeat":true,"theVerge":true,"wired":true},"categories":["AI Research","Industry News","Products & Tools","Policy & Ethics","Science","Business"],"keywords":["artificial intelligence","machine learning","LLM","GPT","neural network","deep learning"]}',
  datetime('now'),
  'system'
);
