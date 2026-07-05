ALTER TABLE "BookingSlot"
DROP CONSTRAINT IF EXISTS "BookingSlot_rescheduleSourceSlotId_fkey";

DROP INDEX IF EXISTS "BookingSlot_rescheduleSourceSlotId_idx";

ALTER TABLE "BookingSlot"
DROP COLUMN IF EXISTS "rescheduleSourceSlotId";
