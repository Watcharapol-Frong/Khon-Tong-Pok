-- CreateTable
CREATE TABLE "JobSeekerProfile" (
    "id" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "firstNameTh" TEXT,
    "lastNameTh" TEXT,
    "firstNameEn" TEXT,
    "lastNameEn" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "maritalStatus" TEXT,
    "address" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "militaryStatus" TEXT,
    "desiredPosition" TEXT,
    "desiredSalaryMin" INTEGER,
    "desiredSalaryMax" INTEGER,
    "desiredJobType" TEXT,
    "desiredProvince" TEXT,
    "availableDate" TIMESTAMP(3),
    "computerSkills" TEXT[],
    "resumeRawText" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "gpa" DOUBLE PRECISION,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EducationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperienceEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "responsibilities" TEXT,
    "salary" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkExperienceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageSkillEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "speaking" TEXT,
    "reading" TEXT,
    "writing" TEXT,

    CONSTRAINT "LanguageSkillEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "issueDate" TIMESTAMP(3),
    "fileUrl" TEXT,

    CONSTRAINT "CertificateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerProfile_jobSeekerId_key" ON "JobSeekerProfile"("jobSeekerId");

-- AddForeignKey
ALTER TABLE "JobSeekerProfile" ADD CONSTRAINT "JobSeekerProfile_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationEntry" ADD CONSTRAINT "EducationEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "JobSeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperienceEntry" ADD CONSTRAINT "WorkExperienceEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "JobSeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageSkillEntry" ADD CONSTRAINT "LanguageSkillEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "JobSeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateEntry" ADD CONSTRAINT "CertificateEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "JobSeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: carry existing ResumeExtraction rows over into
-- JobSeekerProfile before the old table is dropped below, instead of
-- silently discarding real candidate data (hardSkills -> computerSkills,
-- rawText -> resumeRawText).
INSERT INTO "JobSeekerProfile" ("id", "jobSeekerId", "computerSkills", "resumeRawText", "updatedAt")
SELECT gen_random_uuid()::text, "jobSeekerId", "hardSkills", "rawText", "updatedAt"
FROM "ResumeExtraction";

-- DropForeignKey
ALTER TABLE "ResumeExtraction" DROP CONSTRAINT "ResumeExtraction_jobSeekerId_fkey";

-- DropTable
DROP TABLE "ResumeExtraction";
