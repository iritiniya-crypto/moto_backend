type SlotWithTimes = {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

export function withBookingSlotDuration<T extends SlotWithTimes>(slot: T): T & { durationMinutes?: number } {
  const durationMinutes = getDurationMinutes(slot);

  if (durationMinutes === undefined) {
    return slot;
  }

  return {
    ...slot,
    durationMinutes
  };
}

export function withBookingSlotDurations<T extends SlotWithTimes>(slots: T[]): Array<T & { durationMinutes?: number }> {
  return slots.map(withBookingSlotDuration);
}

function getDurationMinutes(slot: SlotWithTimes) {
  if (!slot.startsAt || !slot.endsAt) {
    return undefined;
  }

  const startsAt = new Date(slot.startsAt).getTime();
  const endsAt = new Date(slot.endsAt).getTime();

  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return undefined;
  }

  return Math.round((endsAt - startsAt) / 60_000);
}
