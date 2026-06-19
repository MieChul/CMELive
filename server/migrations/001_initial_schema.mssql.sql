-- Azure SQL Server schema for CME Live

-- Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    displayName NVARCHAR(255) NOT NULL,
    profilePicUrl NVARCHAR(MAX),
    ssoObjectId NVARCHAR(255) UNIQUE,
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100)
  );
END
GO

-- Surveys
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'surveys')
BEGIN
  CREATE TABLE surveys (
    id INT IDENTITY(1,1) PRIMARY KEY,
    createdByUserId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX) NOT NULL DEFAULT '',
    imageUrl NVARCHAR(MAX),
    status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled')),
    activeFromDate DATETIME2,
    activeToDate DATETIME2,
    aiReviewScore FLOAT,
    isReviewed BIT NOT NULL DEFAULT 0,
    reviewJson NVARCHAR(MAX),
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100)
  );
  CREATE INDEX idx_surveys_owner ON surveys(createdByUserId);
  CREATE INDEX idx_surveys_status ON surveys(status);
END
GO

-- Questions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'questions')
BEGIN
  CREATE TABLE questions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    surveyId INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    questionText NVARCHAR(MAX) NOT NULL,
    questionType NVARCHAR(50) NOT NULL,
    isRequired BIT NOT NULL DEFAULT 1,
    orderIndex INT NOT NULL DEFAULT 0,
    optionsJson NVARCHAR(MAX),
    aiConfidenceScore FLOAT,
    aiSuggestionJson NVARCHAR(MAX),
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100)
  );
  CREATE INDEX idx_questions_survey ON questions(surveyId);
END
GO

-- Question options
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'question_options')
BEGIN
  CREATE TABLE question_options (
    id INT IDENTITY(1,1) PRIMARY KEY,
    questionId INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    optionText NVARCHAR(MAX) NOT NULL,
    orderIndex INT NOT NULL DEFAULT 0,
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100)
  );
  CREATE INDEX idx_qo_question ON question_options(questionId);
END
GO

-- Responses
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'responses')
BEGIN
  CREATE TABLE responses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    surveyId INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    respondentUserId INT NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    submittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100),
    CONSTRAINT UQ_response_survey_user UNIQUE (surveyId, respondentUserId)
  );
  CREATE INDEX idx_responses_survey ON responses(surveyId);
END
GO

-- Answers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'answers')
BEGIN
  CREATE TABLE answers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    responseId INT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    questionId INT NOT NULL REFERENCES questions(id) ON DELETE NO ACTION,
    answerText NVARCHAR(MAX),
    sentimentLabel NVARCHAR(50),
    sentimentScore FLOAT,
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    createdBy NVARCHAR(100),
    updatedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedBy NVARCHAR(100),
    CONSTRAINT UQ_answer_response_question UNIQUE (responseId, questionId)
  );
  CREATE INDEX idx_answers_question ON answers(questionId);
END
GO

-- Survey Votes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'survey_votes')
BEGIN
  CREATE TABLE survey_votes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    surveyId INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    userId INT NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    createdDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_vote_survey_user UNIQUE (surveyId, userId)
  );
  CREATE INDEX idx_votes_survey ON survey_votes(surveyId);
END
GO
