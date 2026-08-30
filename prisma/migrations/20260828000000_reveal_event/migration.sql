-- CreateTable
CREATE TABLE "RevealEvent" (
    "id" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "hrUserId" TEXT NOT NULL,
    "positionId" TEXT,
    "reason" TEXT NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevealEvent_jobSeekerId_revealedAt_idx" ON "RevealEvent"("jobSeekerId", "revealedAt");

-- CreateIndex
CREATE INDEX "RevealEvent_hrUserId_revealedAt_idx" ON "RevealEvent"("hrUserId", "revealedAt");

-- AddForeignKey
ALTER TABLE "RevealEvent" ADD CONSTRAINT "RevealEvent_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevealEvent" ADD CONSTRAINT "RevealEvent_hrUserId_fkey" FOREIGN KEY ("hrUserId") REFERENCES "HRUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevealEvent" ADD CONSTRAINT "RevealEvent_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

