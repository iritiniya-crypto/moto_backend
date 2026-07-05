CREATE TYPE "UserRole" AS ENUM ('INSTRUCTOR', 'STUDENT');
CREATE TYPE "StudentLevel" AS ENUM ('BEGINNER', 'BASIC', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "BookingSlotStatus" AS ENUM ('available', 'requested', 'confirmed', 'completed', 'cancelled');
CREATE TYPE "TrainingPackagePaymentStatus" AS ENUM ('unpaid', 'paid', 'partial');
CREATE TYPE "TrainingPackageStatus" AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT,
  "telegramUsername" TEXT,
  "displayName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "telegramUsername" TEXT,
  "level" "StudentLevel" NOT NULL DEFAULT 'BEGINNER',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Skill" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentSkill" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "percent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingSlot" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "BookingSlotStatus" NOT NULL DEFAULT 'available',
  "title" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "instructorId" TEXT,
  "studentId" TEXT,
  "requestedById" TEXT,
  "requestedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingReport" (
  "id" TEXT NOT NULL,
  "bookingSlotId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "instructorId" TEXT,
  "trainedOn" TEXT NOT NULL,
  "successes" TEXT NOT NULL,
  "focusNext" TEXT NOT NULL,
  "levelChange" "StudentLevel",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingHistory" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "bookingSlotId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "trainedAt" TIMESTAMP(3) NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingVideo" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "trainingHistoryId" TEXT,
  "reportId" TEXT,
  "telegramUrl" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingPackage" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "usedSessions" INTEGER NOT NULL DEFAULT 0,
  "paymentStatus" "TrainingPackagePaymentStatus" NOT NULL DEFAULT 'unpaid',
  "status" "TrainingPackageStatus" NOT NULL DEFAULT 'active',
  "purchasedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarSyncEvent" (
  "id" TEXT NOT NULL,
  "bookingSlotId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalEventId" TEXT,
  "payload" JSONB,
  "syncedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarSyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "User_telegramUsername_key" ON "User"("telegramUsername");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE UNIQUE INDEX "StudentSkill_studentId_skillId_key" ON "StudentSkill"("studentId", "skillId");
CREATE INDEX "BookingSlot_startsAt_idx" ON "BookingSlot"("startsAt");
CREATE INDEX "BookingSlot_status_idx" ON "BookingSlot"("status");
CREATE INDEX "BookingSlot_studentId_idx" ON "BookingSlot"("studentId");
CREATE UNIQUE INDEX "TrainingReport_bookingSlotId_key" ON "TrainingReport"("bookingSlotId");
CREATE UNIQUE INDEX "TrainingHistory_bookingSlotId_key" ON "TrainingHistory"("bookingSlotId");
CREATE UNIQUE INDEX "TrainingHistory_reportId_key" ON "TrainingHistory"("reportId");
CREATE INDEX "TrainingHistory_studentId_trainedAt_idx" ON "TrainingHistory"("studentId", "trainedAt");
CREATE INDEX "TrainingPackage_studentId_status_idx" ON "TrainingPackage"("studentId", "status");
CREATE INDEX "CalendarSyncEvent_provider_externalEventId_idx" ON "CalendarSyncEvent"("provider", "externalEventId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingReport" ADD CONSTRAINT "TrainingReport_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES "BookingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingReport" ADD CONSTRAINT "TrainingReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingReport" ADD CONSTRAINT "TrainingReport_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingHistory" ADD CONSTRAINT "TrainingHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingHistory" ADD CONSTRAINT "TrainingHistory_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES "BookingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingHistory" ADD CONSTRAINT "TrainingHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TrainingReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingVideo" ADD CONSTRAINT "TrainingVideo_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingVideo" ADD CONSTRAINT "TrainingVideo_trainingHistoryId_fkey" FOREIGN KEY ("trainingHistoryId") REFERENCES "TrainingHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingVideo" ADD CONSTRAINT "TrainingVideo_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TrainingReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarSyncEvent" ADD CONSTRAINT "CalendarSyncEvent_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES "BookingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarSyncEvent" ADD CONSTRAINT "CalendarSyncEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_percent_check" CHECK ("percent" >= 0 AND "percent" <= 100);
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_totalSessions_check" CHECK ("totalSessions" >= 0);
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_usedSessions_check" CHECK ("usedSessions" >= 0);
