import { PrismaClient, StudentLevel } from '@prisma/client';

const prisma = new PrismaClient();

const skillNames = [
  'Овал',
  'Восьмерка',
  'Змейка',
  'Торможение',
  'Развороты',
  'Медленная езда',
  'Взгляд',
  'Город'
];

async function ensurePackage(data: {
  studentId: string;
  title: string;
  totalSessions: number;
  usedSessions: number;
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  status: 'active' | 'completed' | 'cancelled';
  purchasedAt?: Date;
  notes?: string;
}) {
  const existing = await prisma.trainingPackage.findFirst({
    where: {
      studentId: data.studentId,
      title: data.title
    }
  });

  if (existing) {
    return prisma.trainingPackage.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.trainingPackage.create({ data });
}

async function ensureSlot(data: {
  startsAt: Date;
  endsAt: Date;
  status: 'available' | 'requested' | 'reschedule' | 'confirmed' | 'completed' | 'cancelled';
  title: string;
  location: string;
  instructorId: string;
  studentId?: string;
  requestedById?: string;
  requestedAt?: Date;
  confirmedAt?: Date;
}) {
  const existing = await prisma.bookingSlot.findFirst({
    where: {
      startsAt: data.startsAt,
      instructorId: data.instructorId
    }
  });

  if (existing) {
    return prisma.bookingSlot.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.bookingSlot.create({ data });
}

async function main() {
  const nikita = await prisma.user.upsert({
    where: { telegramUsername: 'nikita_instructor' },
    update: {},
    create: {
      displayName: 'Никита',
      telegramUsername: 'nikita_instructor',
      role: 'INSTRUCTOR'
    }
  });

  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const alexUser = await prisma.user.upsert({
    where: { telegramUsername: 'alex_moto' },
    update: {},
    create: {
      displayName: 'Алексей',
      telegramUsername: 'alex_moto',
      role: 'STUDENT'
    }
  });

  const alex = await prisma.student.upsert({
    where: { userId: alexUser.id },
    update: {},
    create: {
      userId: alexUser.id,
      name: 'Алексей',
      telegramUsername: 'alex_moto',
      level: StudentLevel.BASIC,
      notes: 'Учится уверенно проходить площадку.'
    }
  });

  const mariaUser = await prisma.user.upsert({
    where: { telegramUsername: 'maria_rides' },
    update: {},
    create: {
      displayName: 'Мария',
      telegramUsername: 'maria_rides',
      role: 'STUDENT'
    }
  });

  const maria = await prisma.student.upsert({
    where: { userId: mariaUser.id },
    update: {},
    create: {
      userId: mariaUser.id,
      name: 'Мария',
      telegramUsername: 'maria_rides',
      level: StudentLevel.BEGINNER
    }
  });

  await prisma.studentSkill.createMany({
    data: [
      { studentId: alex.id, skillId: skills[0].id, percent: 70 },
      { studentId: alex.id, skillId: skills[1].id, percent: 55 },
      { studentId: alex.id, skillId: skills[3].id, percent: 65 },
      { studentId: maria.id, skillId: skills[0].id, percent: 25 },
      { studentId: maria.id, skillId: skills[5].id, percent: 20 }
    ],
    skipDuplicates: true
  });

  await ensurePackage({
    studentId: alex.id,
    title: 'Пакет 4 тренировки',
    totalSessions: 4,
    usedSessions: 4,
    paymentStatus: 'paid',
    status: 'completed',
    purchasedAt: new Date('2026-05-01T10:00:00.000Z'),
    notes: 'Закрытый пакет. Не связан автоматически с историей.'
  });

  await ensurePackage({
    studentId: alex.id,
    title: 'Пакет 3 тренировки',
    totalSessions: 3,
    usedSessions: 0,
    paymentStatus: 'paid',
    status: 'active',
    purchasedAt: new Date('2026-05-25T10:00:00.000Z')
  });

  await ensurePackage({
    studentId: maria.id,
    title: 'Пробный пакет',
    totalSessions: 2,
    usedSessions: 0,
    paymentStatus: 'partial',
    status: 'active'
  });

  const completedSlot = await ensureSlot({
    startsAt: new Date('2026-05-28T15:00:00.000Z'),
    endsAt: new Date('2026-05-28T16:30:00.000Z'),
    status: 'completed',
    title: 'Площадка',
    location: 'Учебная площадка',
    instructorId: nikita.id,
    studentId: alex.id,
    requestedById: alexUser.id,
    requestedAt: new Date('2026-05-26T12:00:00.000Z'),
    confirmedAt: new Date('2026-05-26T13:00:00.000Z')
  });

  const report = await prisma.trainingReport.upsert({
    where: { bookingSlotId: completedSlot.id },
    update: {
      studentId: alex.id,
      instructorId: nikita.id,
      trainedOn: 'Восьмерка, торможение, взгляд в повороте',
      successes: 'Стабильнее держит траекторию и раньше смотрит в выход.',
      focusNext: 'Не зажимать руль на малой скорости, добавить плавности газа.',
      levelChange: StudentLevel.INTERMEDIATE
    },
    create: {
      bookingSlotId: completedSlot.id,
      studentId: alex.id,
      instructorId: nikita.id,
      trainedOn: 'Восьмерка, торможение, взгляд в повороте',
      successes: 'Стабильнее держит траекторию и раньше смотрит в выход.',
      focusNext: 'Не зажимать руль на малой скорости, добавить плавности газа.',
      levelChange: StudentLevel.INTERMEDIATE
    }
  });

  const history = await prisma.trainingHistory.upsert({
    where: { bookingSlotId: completedSlot.id },
    update: {
      studentId: alex.id,
      reportId: report.id,
      trainedAt: completedSlot.startsAt,
      summary: 'Тренировка завершена, отчет сохранен.'
    },
    create: {
      studentId: alex.id,
      bookingSlotId: completedSlot.id,
      reportId: report.id,
      trainedAt: completedSlot.startsAt,
      summary: 'Тренировка завершена, отчет сохранен.'
    }
  });

  const existingVideo = await prisma.trainingVideo.findFirst({
    where: {
      trainingHistoryId: history.id,
      telegramUrl: 'https://t.me/example_video/1'
    }
  });

  if (existingVideo) {
    await prisma.trainingVideo.update({
      where: { id: existingVideo.id },
      data: {
        studentId: alex.id,
        reportId: report.id,
        title: 'Восьмерка после корректировки взгляда'
      }
    });
  } else {
    await prisma.trainingVideo.create({
      data: {
        studentId: alex.id,
        trainingHistoryId: history.id,
        reportId: report.id,
        telegramUrl: 'https://t.me/example_video/1',
        title: 'Восьмерка после корректировки взгляда'
      }
    });
  }

  await ensureSlot({
    startsAt: new Date('2026-06-03T15:00:00.000Z'),
    endsAt: new Date('2026-06-03T16:30:00.000Z'),
    status: 'available',
    title: 'Свободный слот',
    location: 'Учебная площадка',
    instructorId: nikita.id
  });

  await ensureSlot({
    startsAt: new Date('2026-06-05T15:00:00.000Z'),
    endsAt: new Date('2026-06-05T16:30:00.000Z'),
    status: 'requested',
    title: 'Заявка на тренировку',
    location: 'Учебная площадка',
    instructorId: nikita.id,
    studentId: maria.id,
    requestedById: mariaUser.id,
    requestedAt: new Date('2026-06-01T09:00:00.000Z')
  });

  await ensureSlot({
    startsAt: new Date('2026-06-07T12:00:00.000Z'),
    endsAt: new Date('2026-06-07T13:30:00.000Z'),
    status: 'confirmed',
    title: 'Подтвержденная тренировка',
    location: 'Учебная площадка',
    instructorId: nikita.id,
    studentId: alex.id,
    requestedById: alexUser.id,
    requestedAt: new Date('2026-06-01T10:00:00.000Z'),
    confirmedAt: new Date('2026-06-01T10:30:00.000Z')
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
