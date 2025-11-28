-- CreateTable
CREATE TABLE "SubmissionHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "submissionItemId" TEXT,
    "actionType" VARCHAR(50) NOT NULL,
    "adminNotes" TEXT,
    "finalConditionMedia" VARCHAR(50),
    "finalConditionSleeve" VARCHAR(50),
    "adjustedPrice" DOUBLE PRECISION,
    "sellerResponse" VARCHAR(50),
    "sellerResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionHistory_submissionId_idx" ON "SubmissionHistory"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionHistory_submissionItemId_idx" ON "SubmissionHistory"("submissionItemId");

-- CreateIndex
CREATE INDEX "SubmissionHistory_actionType_idx" ON "SubmissionHistory"("actionType");

-- CreateIndex
CREATE INDEX "SubmissionHistory_createdAt_idx" ON "SubmissionHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "SubmissionHistory" ADD CONSTRAINT "SubmissionHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SellerSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionHistory" ADD CONSTRAINT "SubmissionHistory_submissionItemId_fkey" FOREIGN KEY ("submissionItemId") REFERENCES "SubmissionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
