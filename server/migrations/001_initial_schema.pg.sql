CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "displayName" VARCHAR(255) NOT NULL,
  "profilePicUrl" TEXT,
  "ssoObjectId" VARCHAR(255) UNIQUE,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  "createdByUserId" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled')),
  "activeFromDate" TIMESTAMPTZ,
  "activeToDate" TIMESTAMPTZ,
  "aiReviewScore" FLOAT,
  "isReviewed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reviewJson" TEXT,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_surveys_owner ON surveys("createdByUserId");
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  "surveyId" INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  "questionText" TEXT NOT NULL,
  "questionType" VARCHAR(50) NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
  "orderIndex" INT NOT NULL DEFAULT 0,
  "optionsJson" TEXT,
  "aiConfidenceScore" FLOAT,
  "aiSuggestionJson" TEXT,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions("surveyId");

CREATE TABLE IF NOT EXISTS question_options (
  id SERIAL PRIMARY KEY,
  "questionId" INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  "optionText" TEXT NOT NULL,
  "orderIndex" INT NOT NULL DEFAULT 0,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_qo_question ON question_options("questionId");

CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  "surveyId" INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  "respondentUserId" INT NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100),
  CONSTRAINT uq_response_survey_user UNIQUE ("surveyId", "respondentUserId")
);
CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses("surveyId");

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  "responseId" INT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  "questionId" INT NOT NULL REFERENCES questions(id) ON DELETE NO ACTION,
  "answerText" TEXT,
  "sentimentLabel" VARCHAR(50),
  "sentimentScore" FLOAT,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" VARCHAR(100),
  "updatedDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(100),
  CONSTRAINT uq_answer_response_question UNIQUE ("responseId", "questionId")
);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers("questionId");

CREATE TABLE IF NOT EXISTS survey_votes (
  id SERIAL PRIMARY KEY,
  "surveyId" INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  "userId" INT NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  "createdDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vote_survey_user UNIQUE ("surveyId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_votes_survey ON survey_votes("surveyId");
