ALTER TABLE "Student"
ADD COLUMN "focus" TEXT,
ADD COLUMN "nextTrainingPlan" TEXT;

ALTER TABLE "BookingSlot"
ADD COLUMN "preference" TEXT,
ADD COLUMN "studentComment" TEXT,
ADD COLUMN "finalLocation" TEXT,
ADD COLUMN "finalLocationUrl" TEXT,
ADD COLUMN "instructorComment" TEXT;

ALTER TABLE "TrainingHistory"
ALTER COLUMN "bookingSlotId" DROP NOT NULL,
ALTER COLUMN "reportId" DROP NOT NULL;
