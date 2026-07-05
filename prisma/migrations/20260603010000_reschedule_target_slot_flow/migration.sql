ALTER TABLE "BookingSlot"
ADD COLUMN "rescheduleSourceSlotId" TEXT;

CREATE INDEX "BookingSlot_rescheduleSourceSlotId_idx" ON "BookingSlot"("rescheduleSourceSlotId");

ALTER TABLE "BookingSlot"
ADD CONSTRAINT "BookingSlot_rescheduleSourceSlotId_fkey"
FOREIGN KEY ("rescheduleSourceSlotId") REFERENCES "BookingSlot"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
