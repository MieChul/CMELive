-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  profilePicUrl TEXT,
  ssoObjectId TEXT UNIQUE,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT
);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  createdByUserId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  imageUrl TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled')),
  activeFromDate TEXT,
  activeToDate TEXT,
  aiReviewScore REAL,
  isReviewed INTEGER NOT NULL DEFAULT 0,
  reviewJson TEXT,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT
);

CREATE INDEX IF NOT EXISTS idx_surveys_owner ON surveys(createdByUserId);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surveyId INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  questionText TEXT NOT NULL,
  questionType TEXT NOT NULL,
  isRequired INTEGER NOT NULL DEFAULT 1,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  optionsJson TEXT,
  aiConfidenceScore REAL,
  aiSuggestionJson TEXT,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(surveyId);

-- Question options (normalized; also options may be in optionsJson for grids)
CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionId INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  optionText TEXT NOT NULL,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT
);

CREATE INDEX IF NOT EXISTS idx_qo_question ON question_options(questionId);

-- Responses
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surveyId INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondentUserId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submittedAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT,
  UNIQUE(surveyId, respondentUserId)
);

CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(surveyId);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responseId INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  questionId INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answerText TEXT,
  sentimentLabel TEXT,
  sentimentScore REAL,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT,
  UNIQUE(responseId, questionId)
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(questionId);

-- Votes (one per user per survey)
CREATE TABLE IF NOT EXISTS survey_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surveyId INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(surveyId, userId)
);

CREATE INDEX IF NOT EXISTS idx_votes_survey ON survey_votes(surveyId);

-- News (AI generated / admin reviewed)
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  publishedDate TEXT,
  createdDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT,
  updatedDate TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_publishedDate ON news(publishedDate);