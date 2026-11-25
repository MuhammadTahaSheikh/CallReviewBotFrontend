-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "callType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "representativeName" TEXT,
    "participantName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "evaluationStatus" TEXT NOT NULL DEFAULT 'not_started',
    "conversationState" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "durationSec" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PracticeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "inputMethod" TEXT NOT NULL DEFAULT 'text',
    "sequence" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "overallScore" REAL,
    "categoryScores" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "suggestedResponses" TEXT NOT NULL,
    "missedOpportunities" TEXT NOT NULL,
    "objectiveAssessment" TEXT NOT NULL,
    "coachingRecommendations" TEXT NOT NULL,
    "trainingWarnings" TEXT,
    "evaluationMode" TEXT NOT NULL,
    "demoMode" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PracticeEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PracticeSession_callType_idx" ON "PracticeSession"("callType");

-- CreateIndex
CREATE INDEX "PracticeSession_difficulty_idx" ON "PracticeSession"("difficulty");

-- CreateIndex
CREATE INDEX "PracticeSession_status_idx" ON "PracticeSession"("status");

-- CreateIndex
CREATE INDEX "PracticeSession_createdAt_idx" ON "PracticeSession"("createdAt");

-- CreateIndex
CREATE INDEX "PracticeSession_scenarioId_idx" ON "PracticeSession"("scenarioId");

-- CreateIndex
CREATE INDEX "PracticeMessage_sessionId_idx" ON "PracticeMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeMessage_sessionId_sequence_key" ON "PracticeMessage"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeEvaluation_sessionId_key" ON "PracticeEvaluation"("sessionId");
