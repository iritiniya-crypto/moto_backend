ALTER TABLE "BookingSlot"
ADD COLUMN "previousStartsAt" TIMESTAMP(3),
ADD COLUMN "previousDurationMinutes" INTEGER;

ALTER TABLE "BookingSlot"
ADD CONSTRAINT "BookingSlot_previousDurationMinutes_check"
CHECK ("previousDurationMinutes" IS NULL OR "previousDurationMinutes" >= 0);
