type SlotWithTimes = {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  student?: {
    packages?: TrainingPackageForResponse[];
    [key: string]: unknown;
  } | null;
};

type TrainingPackageForResponse = {
  id: string;
  studentId: string;
  type?: string | null;
  name?: string | null;
  title?: string | null;
  totalSessions: number;
  usedSessions: number;
  paymentStatus: string;
  status: string;
  purchasedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function withBookingSlotDuration<T extends SlotWithTimes>(slot: T): T & { durationMinutes?: number } {
  const durationMinutes = getDurationMinutes(slot);
  const student = formatStudent(slot.student);

  if (durationMinutes === undefined) {
    return student ? { ...slot, student } : slot;
  }

  return {
    ...slot,
    ...(student ? { student } : {}),
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

function formatStudent(student: SlotWithTimes['student']) {
  if (!student?.packages) {
    return student;
  }

  const packages = student.packages.map(formatPackage);
  const activePackage = packages[0] ?? null;

  return {
    ...student,
    packages,
    activePackage,
    package: activePackage
  };
}

function formatPackage(trainingPackage: TrainingPackageForResponse) {
  const type = trainingPackage.type ?? 'motorcycle';

  return {
    id: trainingPackage.id,
    studentId: trainingPackage.studentId,
    type,
    name: trainingPackage.name ?? packageTypeName(type),
    totalTrainings: trainingPackage.totalSessions,
    completedTrainings: trainingPackage.usedSessions,
    paymentStatus: trainingPackage.paymentStatus,
    startedAt: trainingPackage.purchasedAt,
    endedAt: trainingPackage.expiresAt,
    isActive: trainingPackage.status === 'active',
    createdAt: trainingPackage.createdAt,
    updatedAt: trainingPackage.updatedAt
  };
}

function packageTypeName(type: string) {
  const packageNames: Record<string, string> = {
    scooter: 'Скутер',
    motorcycle: 'Мотоцикл',
    gymkhana: 'Джимхана'
  };

  return packageNames[type] ?? 'Мотоцикл';
}
