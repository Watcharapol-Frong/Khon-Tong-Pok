-- CreateTable
CREATE TABLE "ResumeGapAnalysis" (
    "id" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "missingTitle" TEXT NOT NULL,
    "missingDetail" TEXT NOT NULL,
    "nextSteps" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceHash" TEXT NOT NULL,

    CONSTRAINT "ResumeGapAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeGapAnalysis_jobSeekerId_key" ON "ResumeGapAnalysis"("jobSeekerId");

-- AddForeignKey
ALTER TABLE "ResumeGapAnalysis" ADD CONSTRAINT "ResumeGapAnalysis_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
