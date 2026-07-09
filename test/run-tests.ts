import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BookingSlotStatus, StudentLevel} from '@prisma/client';
import {BookingSlotsService} from '../src/booking/booking-slots.service';
import {InstructorCalendarService} from '../src/calendar/instructor-calendar.service';
import {NotificationsService} from '../src/notifications/notifications.service';
import {TrainingReminderService} from '../src/notifications/training-reminder.service';
import {TrainingReportsService} from '../src/reports/training-reports.service';
import {SkillsService} from '../src/skills/skills.service';
import {StudentsService} from '../src/students/students.service';
import {TrainingVideosService} from '../src/videos/training-videos.service';
import {InstructorsService} from '../src/instructors/instructors.service';
import {TelegramBotService} from '../src/telegram/telegram-bot.service';

function mockFn<TArgs extends any[] = any[], TResult = any>(impl?: (...args: TArgs) => TResult) {
  const calls: TArgs[] = [];
  let implementation = impl;

  const fn = ((...args: TArgs) => {
    calls.push(args);
    if (!implementation) {
      return undefined as TResult;
    }

    return implementation(...args);
  }) as ((...args: TArgs) => TResult) & {
    calls: TArgs[];
    mockReturnValue(value: TResult): void;
    mockResolvedValue(value: Awaited<TResult>): void;
    mockRejectedValue(error: unknown): void;
    mockImplementation(next: (...args: TArgs) => TResult): void;
  };

  fn.calls = calls;
  fn.mockReturnValue = (value: TResult) => {
    implementation = () => value;
    return fn;
  };
  fn.mockResolvedValue = (value: Awaited<TResult>) => {
    implementation = async () => value as TResult;
    return fn;
  };
  fn.mockRejectedValue = (error: unknown) => {
    implementation = async () => {
      throw error;
    };
    return fn;
  };
  fn.mockImplementation = (next: (...args: TArgs) => TResult) => {
    implementation = next;
    return fn;
  };

  return fn;
}

function mockNotifications() {
  return {
    notifyInstructorBookingRequested: mockFn().mockResolvedValue({ delivered: false }),
    notifyInstructorStudentCreated: mockFn().mockResolvedValue({ delivered: false }),
    notifyInstructorTrainingRescheduled: mockFn().mockResolvedValue({ delivered: false }),
    notifyInstructorTrainingReminder: mockFn().mockResolvedValue({ delivered: false }),
    notifyInstructorTrainingCancelled: mockFn().mockResolvedValue({ delivered: false })
  };
}

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    return false;
  }
}

async function main() {
  let passed = 0;
  let failed = 0;

  const instructorId = randomUUID();
  const userId = randomUUID();
  const studentId = randomUUID();
  const slotId = randomUUID();
  const historyId = randomUUID();
  const reportId = randomUUID();

  await run('SkillsService.findAll orders by name', async () => {
    const prisma = { skill: { findMany: mockFn().mockResolvedValue([{ id: 'skill-1', name: 'Овал' }]) } } as any;
    const service = new SkillsService(prisma);
    const result = await service.findAll();

    assert.equal(prisma.skill.findMany.calls.length, 1);
    assert.deepEqual(prisma.skill.findMany.calls[0][0], { orderBy: { name: 'asc' } });
    assert.deepEqual(result, [{ id: 'skill-1', name: 'Овал' }]);
  }) ? passed++ : failed++;

  await run('InstructorCalendarService.findAll loads calendar data', async () => {
    const prisma = {
      bookingSlot: {
        findMany: mockFn().mockResolvedValue([
          {
            id: slotId,
            startsAt: new Date('2026-06-04T09:00:00.000Z'),
            endsAt: new Date('2026-06-04T10:00:00.000Z')
          }
        ])
      }
    } as any;
    const service = new InstructorCalendarService(prisma);
    const result = await service.findAll();

    assert.equal(prisma.bookingSlot.findMany.calls.length, 1);
    const query = prisma.bookingSlot.findMany.calls[0][0];
    assert.ok(query.where.startsAt.gte instanceof Date);
    assert.deepEqual(query.orderBy, { startsAt: 'asc' });
    assert.ok(query.include.student);
    assert.ok(query.include.instructor);
    assert.ok(query.include.calendarEvents);
    assert.ok(query.include.report);
    assert.equal(result[0].durationMinutes, 60);
  }) ? passed++ : failed++;

  await run('InstructorsService.findAll returns ordered instructors with students', async () => {
    const prisma = {
      instructor: { findMany: mockFn().mockResolvedValue([{ id: instructorId, firstName: 'Никита' }]) }
    } as any;
    const service = new InstructorsService(prisma);
    const result = await service.findAll();

    assert.equal(prisma.instructor.findMany.calls.length, 1);
    const query = prisma.instructor.findMany.calls[0][0];
    assert.deepEqual(query.orderBy, [{ lastName: 'asc' }, { firstName: 'asc' }]);
    assert.ok(query.include.students);
    assert.deepEqual(result, [{ id: instructorId, firstName: 'Никита' }]);
  }) ? passed++ : failed++;

  await run('InstructorsService.findProfile throws for missing instructor', async () => {
    const prisma = { instructor: { findUnique: mockFn().mockResolvedValue(null) } } as any;
    const service = new InstructorsService(prisma);
    await assert.rejects(() => service.findProfile(instructorId), /Instructor .* was not found/);
  }) ? passed++ : failed++;

  await run('TrainingVideosService.createForTrainingHistory creates linked video', async () => {
    const prisma = {
      trainingHistory: { findUnique: mockFn().mockResolvedValue({ id: historyId, studentId, reportId }) },
      trainingVideo: { create: mockFn().mockResolvedValue({ id: 'video-1' }) }
    } as any;
    const service = new TrainingVideosService(prisma);
    const result = await service.createForTrainingHistory(historyId, {
      title: 'Видео',
      telegramUrl: 'https://t.me/video/1',
      comment: 'ok'
    });

    assert.equal(prisma.trainingVideo.create.calls.length, 1);
    assert.deepEqual(prisma.trainingVideo.create.calls[0][0], {
      data: {
        studentId,
        trainingHistoryId: historyId,
        reportId,
        title: 'Видео',
        telegramUrl: 'https://t.me/video/1',
        notes: 'ok'
      }
    });
    assert.deepEqual(result, { id: 'video-1' });
  }) ? passed++ : failed++;

  await run('TrainingVideosService.createForTrainingHistory rejects missing history', async () => {
    const prisma = { trainingHistory: { findUnique: mockFn().mockResolvedValue(null) } } as any;
    const service = new TrainingVideosService(prisma);
    await assert.rejects(() => service.createForTrainingHistory(historyId, { title: 'Видео', telegramUrl: 'u' }), /Training history .* was not found/);
  }) ? passed++ : failed++;

  await run('NotificationsService.notifyInstructorTrainingCancelled formats notification', async () => {
    const service = new NotificationsService();
    const log = mockFn();
    (service as any).logger = { log };

    const result = await service.notifyInstructorTrainingCancelled({
      studentName: 'Алексей',
      startsAt: new Date('2026-06-04T09:00:00.000Z'),
      durationMinutes: 90,
      location: 'Площадка',
      slotId: 'slot-1'
    });

    assert.equal(log.calls.length, 1);
    assert.equal(result.delivered, false);
    assert.equal(result.provider, 'stub');
    assert.match(result.message, /Алексей отменил тренировку/);
  }) ? passed++ : failed++;

  await run('TrainingReminderService sends one-hour reminders once per slot', async () => {
    const startsAt = new Date(Date.now() + 60 * 60_000);
    const prisma = {
      bookingSlot: {
        findMany: mockFn().mockResolvedValue([
          {
            id: slotId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 90 * 60_000),
            finalLocation: 'Площадка',
            location: null,
            student: {
              name: 'Алексей',
              telegramUsername: 'alex_moto'
            }
          }
        ])
      }
    } as any;
    const notifications = mockNotifications();
    const config = { get: mockFn((_key: string, fallback: unknown) => fallback) } as any;
    const service = new TrainingReminderService(prisma, notifications as any, config);

    await service.sendUpcomingTrainingReminders();
    await service.sendUpcomingTrainingReminders();

    assert.equal(notifications.notifyInstructorTrainingReminder.calls.length, 1);
    assert.equal(notifications.notifyInstructorTrainingReminder.calls[0][0].studentName, 'Алексей');
    assert.equal(notifications.notifyInstructorTrainingReminder.calls[0][0].telegramUsername, 'alex_moto');
    assert.equal(notifications.notifyInstructorTrainingReminder.calls[0][0].durationMinutes, 90);
  }) ? passed++ : failed++;

  await run('TelegramBotService.handleUpdate replies with chat id', async () => {
    const config = {
      get: mockFn((key: string, fallback: unknown) => {
        const values: Record<string, unknown> = {
          TELEGRAM_ENABLED: true,
          TELEGRAM_BOT_TOKEN: 'token'
        };

        return values[key] ?? fallback;
      })
    } as any;
    const sendMessage = mockFn().mockResolvedValue({ delivered: true, provider: 'telegram' });
    const telegramApi = {
      getStatus: mockFn().mockReturnValue({ enabled: true, configured: true }),
      sendMessage
    } as any;
    const service = new TelegramBotService(config, telegramApi);

    const result = await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        text: '/chat_id',
        chat: { id: 123456789, type: 'private' },
        from: { id: 987654321, is_bot: false, username: 'nikita' }
      }
    });

    assert.deepEqual(result, { handled: true });
    assert.equal(sendMessage.calls.length, 1);
    assert.equal(sendMessage.calls[0][0], 123456789);
    assert.match(sendMessage.calls[0][1], /chat_id: 123456789/);
    assert.match(sendMessage.calls[0][1], /user_id: 987654321/);
  }) ? passed++ : failed++;

  await run('TrainingReportsService.create writes report, history and completes slot', async () => {
    const tx = {
      bookingSlot: {
        findUnique: mockFn().mockResolvedValue({ id: slotId, status: 'confirmed', startsAt: new Date('2026-06-04T09:00:00.000Z'), instructorId: instructorId, studentId }),
        update: mockFn().mockResolvedValue({ id: slotId, status: 'completed' })
      },
      student: {
        findUnique: mockFn().mockResolvedValue({ id: studentId }),
        update: mockFn().mockResolvedValue({ id: studentId, level: StudentLevel.INTERMEDIATE })
      },
      trainingReport: {
        findUnique: mockFn().mockResolvedValue(null),
        create: mockFn().mockResolvedValue({ id: reportId })
      },
      trainingHistory: {
        create: mockFn().mockResolvedValue({ id: historyId })
      },
      trainingPackage: {
        findFirst: mockFn().mockResolvedValue({
          id: 'package-1',
          studentId,
          type: 'motorcycle',
          name: 'Мотоцикл',
          totalSessions: 4,
          usedSessions: 1,
          paymentStatus: 'paid',
          status: 'active',
          purchasedAt: null,
          expiresAt: null,
          createdAt: new Date('2026-06-01T09:00:00.000Z'),
          updatedAt: new Date('2026-06-01T09:00:00.000Z')
        }),
        update: mockFn().mockResolvedValue({
          id: 'package-1',
          studentId,
          type: 'motorcycle',
          name: 'Мотоцикл',
          totalSessions: 4,
          usedSessions: 2,
          paymentStatus: 'paid',
          status: 'active',
          purchasedAt: null,
          expiresAt: null,
          createdAt: new Date('2026-06-01T09:00:00.000Z'),
          updatedAt: new Date('2026-06-01T09:00:00.000Z')
        })
      }
    } as any;
    const prisma = { $transaction: mockFn(async (cb: any) => cb(tx)) } as any;
    const service = new TrainingReportsService(prisma);

    const result = await service.create({
      slotId,
      studentId,
      trainedSkills: ['Овал', 'Торможение'],
      improved: 'Стало лучше',
      nextFocus: 'Взгляд',
      levelUpdate: StudentLevel.INTERMEDIATE
    });

    assert.equal(prisma.$transaction.calls.length, 1);
    assert.equal(tx.trainingReport.create.calls.length, 1);
    assert.deepEqual(tx.trainingReport.create.calls[0][0].data, {
      bookingSlotId: slotId,
      studentId,
      instructorId,
      trainedOn: 'Овал, Торможение',
      successes: 'Стало лучше',
      focusNext: 'Взгляд',
      levelChange: StudentLevel.INTERMEDIATE
    });
    assert.deepEqual(result.slot, { id: slotId, status: 'completed' });
    assert.equal(tx.trainingPackage.update.calls.length, 1);
    assert.deepEqual(tx.trainingPackage.update.calls[0][0], {
      where: { id: 'package-1' },
      data: {
        usedSessions: {
          increment: 1
        }
      }
    });
    assert.equal(result.trainingPackage.completedTrainings, 2);
    assert.equal(result.trainingPackage.totalTrainings, 4);
  }) ? passed++ : failed++;

  await run('TrainingReportsService.create is idempotent for existing report and does not increment package twice', async () => {
    const existingReport = { id: reportId, bookingSlotId: slotId, studentId };
    const tx = {
      bookingSlot: {
        findUnique: mockFn().mockResolvedValue({ id: slotId, status: 'completed', startsAt: new Date('2026-06-04T09:00:00.000Z'), instructorId: instructorId, studentId })
      },
      trainingReport: {
        findUnique: mockFn().mockResolvedValue(existingReport),
        create: mockFn()
      },
      trainingHistory: {
        findUnique: mockFn().mockResolvedValue({ id: historyId, reportId })
      },
      student: {
        findUnique: mockFn().mockResolvedValue({ id: studentId })
      },
      trainingPackage: {
        findFirst: mockFn().mockResolvedValue({
          id: 'package-1',
          studentId,
          type: 'scooter',
          name: 'Скутер',
          totalSessions: 4,
          usedSessions: 2,
          paymentStatus: 'paid',
          status: 'active',
          purchasedAt: null,
          expiresAt: null,
          createdAt: new Date('2026-06-01T09:00:00.000Z'),
          updatedAt: new Date('2026-06-01T09:00:00.000Z')
        }),
        update: mockFn()
      }
    } as any;
    const prisma = { $transaction: mockFn(async (cb: any) => cb(tx)) } as any;
    const service = new TrainingReportsService(prisma);

    const result = await service.create({
      slotId,
      studentId,
      trainedSkills: ['Овал'],
      improved: 'Уже сохранено',
      nextFocus: 'Без изменений'
    });

    assert.equal(tx.trainingReport.create.calls.length, 0);
    assert.equal(tx.trainingPackage.update.calls.length, 0);
    assert.deepEqual(result.report, existingReport);
    assert.equal(result.trainingPackage.completedTrainings, 2);
    assert.equal(result.trainingPackage.name, 'Скутер');
  }) ? passed++ : failed++;

  await run('StudentsService.create assigns default instructor when not provided', async () => {
    const defaultInstructor = { id: instructorId };
    const tx = {
      user: { create: mockFn().mockResolvedValue({ id: userId }) },
      student: { create: mockFn().mockResolvedValue({ id: studentId }) }
    } as any;
    const prisma = {
      instructor: { findFirst: mockFn().mockResolvedValue(defaultInstructor) },
      user: { create: mockFn().mockResolvedValue({ id: userId }) },
      student: { create: mockFn().mockResolvedValue({ id: studentId }) },
      $transaction: mockFn(async (cb: any) => cb(tx))
    } as any;
    const service = new StudentsService(prisma);

    const result = await service.create({
      name: 'Иван',
      telegramUsername: 'ivan_moto',
      level: StudentLevel.BEGINNER
    });

    assert.equal(prisma.instructor.findFirst.calls.length, 1);
    assert.equal(tx.student.create.calls.length, 1);
    assert.equal(tx.student.create.calls[0][0].data.instructorId, instructorId);
    assert.deepEqual(result, { id: studentId });
  }) ? passed++ : failed++;

  await run('StudentsService list and profile use training history for the same counters', async () => {
    const trainingHistory = [{ id: 'history-1' }, { id: 'history-2' }];
    const packages = [{
      id: 'package-1',
      studentId,
      type: 'gymkhana',
      title: 'Джимхана',
      usedSessions: 0,
      totalSessions: 3,
      paymentStatus: 'paid',
      status: 'active',
      purchasedAt: null,
      expiresAt: null,
      createdAt: new Date('2026-06-01T09:00:00.000Z'),
      updatedAt: new Date('2026-06-01T09:00:00.000Z')
    }];
    const listStudentData = { id: studentId, _count: { trainingHistory: 2 }, packages };
    const profileStudentData = { id: studentId, trainingHistory, packages, slots: [{ id: 'slot-1', status: 'confirmed' }] };
    const prisma = {
      student: {
        findMany: mockFn().mockResolvedValue([listStudentData]),
        findUnique: mockFn().mockResolvedValue(profileStudentData)
      }
    } as any;
    const service = new StudentsService(prisma);

    const [listStudent] = await service.findAll();
    const profileStudent = await service.findProfile(studentId);

    for (const response of [listStudent, profileStudent]) {
      assert.equal(response.completedTrainingsCount, 2);
      assert.equal(response.packages[0].type, 'gymkhana');
      assert.equal(response.packages[0].name, 'Джимхана');
      assert.equal(response.packages[0].completedTrainings, 0);
      assert.equal(response.packages[0].totalTrainings, 3);
    }

    assert.equal(listStudent.trainingHistory, undefined);
    assert.deepEqual(profileStudent.trainingHistory, trainingHistory);
    assert.deepEqual(profileStudent.nextTraining, { id: 'slot-1', status: 'confirmed' });
    assert.equal(prisma.student.findMany.calls[0][0].include.trainingHistory, undefined);
    assert.ok(prisma.student.findMany.calls[0][0].include._count);
    assert.ok(prisma.student.findUnique.calls[0][0].include.trainingHistory);
    assert.ok(prisma.student.findUnique.calls[0][0].include.slots);
  }) ? passed++ : failed++;

  await run('StudentsService.update can reassign instructor', async () => {
    const existingStudent = { id: studentId, userId, instructorId };
    const tx = {
      user: { update: mockFn().mockResolvedValue({ id: userId }) },
      student: { update: mockFn().mockResolvedValue({ id: studentId }) }
    } as any;
    const prisma = {
      student: { findUnique: mockFn().mockResolvedValue(existingStudent) },
      instructor: { findUnique: mockFn().mockResolvedValue({ id: 'new-instructor' }) },
      user: { update: mockFn().mockResolvedValue({ id: userId }) },
      studentUpdate: undefined,
      $transaction: mockFn(async (cb: any) => cb(tx))
    } as any;
    const service = new StudentsService(prisma);

    await service.update(studentId, { instructorId: 'new-instructor' });

    assert.equal(prisma.instructor.findUnique.calls.length, 1);
    assert.equal(tx.student.update.calls[0][0].data.instructorId, 'new-instructor');
  }) ? passed++ : failed++;

  await run('StudentsService.upsertPackage stores package type and returns display name', async () => {
    const existingPackage = {
      id: 'package-1',
      type: 'scooter',
      name: 'Скутер',
      title: 'Скутер',
      totalSessions: 4,
      usedSessions: 1,
      paymentStatus: 'paid',
      status: 'active',
      purchasedAt: new Date('2026-06-01T09:00:00.000Z'),
      expiresAt: null,
      createdAt: new Date('2026-06-01T09:00:00.000Z'),
      updatedAt: new Date('2026-06-01T09:00:00.000Z'),
      studentId
    };
    const prisma = {
      student: { findUnique: mockFn().mockResolvedValue({ id: studentId }) },
      trainingPackage: {
        findFirst: mockFn().mockResolvedValue(existingPackage),
        update: mockFn().mockResolvedValue(existingPackage)
      }
    } as any;
    const service = new StudentsService(prisma);

    const result = await service.upsertPackage(studentId, {
      type: 'scooter',
      totalTrainings: 4,
      completedTrainings: 1,
      paymentStatus: 'paid',
      isActive: true
    } as any);

    assert.equal(prisma.trainingPackage.update.calls[0][0].data.type, 'scooter');
    assert.equal(prisma.trainingPackage.update.calls[0][0].data.name, 'Скутер');
    assert.equal(prisma.trainingPackage.update.calls[0][0].data.title, 'Скутер');
    assert.equal(result.type, 'scooter');
    assert.equal(result.name, 'Скутер');
    assert.equal(result.completedTrainings, 1);
    assert.equal(result.totalTrainings, 4);
  }) ? passed++ : failed++;

  await run('StudentsService.findSkills maps skill progress', async () => {
    const prisma = {
      student: { findUnique: mockFn().mockResolvedValue({ id: studentId }) },
      studentSkill: {
        findMany: mockFn().mockResolvedValue([
          { skillId: 'skill-1', percent: 80, skill: { id: 'skill-1', name: 'Овал' } }
        ])
      }
    } as any;
    const service = new StudentsService(prisma);
    const result = await service.findSkills(studentId);

    assert.deepEqual(result, [
      { skillId: 'skill-1', progressPercent: 80, skill: { id: 'skill-1', name: 'Овал' } }
    ]);
  }) ? passed++ : failed++;

  await run('BookingSlotsService.create uses first instructor and returns durationMinutes', async () => {
    const prisma = {
      user: { findFirst: mockFn().mockResolvedValue({ id: instructorId }) },
      bookingSlot: {
        create: mockFn().mockResolvedValue({
          id: slotId,
          startsAt: new Date('2026-06-04T10:00:00.000Z'),
          endsAt: new Date('2026-06-04T11:00:00.000Z')
        })
      }
    } as any;
    const notifications = mockNotifications() as any;
    const service = new BookingSlotsService(prisma, notifications);

    const result = await service.create({ startsAt: '2026-06-04T10:00:00.000Z', durationMinutes: 90 });

    assert.equal(prisma.user.findFirst.calls.length, 1);
    assert.equal(prisma.bookingSlot.create.calls[0][0].data.instructorId, instructorId);
    assert.equal(result.durationMinutes, 60);
  }) ? passed++ : failed++;

  await run('BookingSlotsService.request assigns student and request metadata', async () => {
    const prisma = {
      bookingSlot: {
        findUnique: mockFn().mockResolvedValue({ id: slotId, status: BookingSlotStatus.available }),
        update: mockFn().mockResolvedValue({
          id: slotId,
          status: BookingSlotStatus.requested,
          startsAt: new Date('2026-06-04T09:00:00.000Z'),
          endsAt: new Date('2026-06-04T10:30:00.000Z'),
          location: 'Площадка'
        })
      },
      student: { findUnique: mockFn().mockResolvedValue({ id: studentId, userId, name: 'Алексей', telegramUsername: 'alex_moto' }) }
    } as any;
    const notifications = mockNotifications();
    const service = new BookingSlotsService(prisma, notifications as any);

    await service.request(slotId, { studentId, preference: 'утро', studentComment: 'удобно' } as any);

    assert.equal(prisma.bookingSlot.update.calls[0][0].data.studentId, studentId);
    assert.equal(prisma.bookingSlot.update.calls[0][0].data.requestedById, userId);
    assert.equal(notifications.notifyInstructorBookingRequested.calls.length, 1);
  }) ? passed++ : failed++;

  await run('BookingSlotsService.cancel frees the slot and notifies instructor', async () => {
    const tx = {
      bookingSlot: {
        findUnique: mockFn().mockResolvedValue({
          id: slotId,
          status: BookingSlotStatus.confirmed,
          startsAt: new Date('2026-06-04T09:00:00.000Z'),
          endsAt: new Date('2026-06-04T10:30:00.000Z'),
          finalLocation: 'Площадка',
          location: 'Площадка',
          student: { id: studentId, name: 'Алексей' }
        }),
        update: mockFn().mockResolvedValue({ id: slotId, status: BookingSlotStatus.available })
      }
    } as any;
    const notifications = mockNotifications() as any;
    const prisma = { $transaction: mockFn(async (cb: any) => cb(tx)) } as any;
    const service = new BookingSlotsService(prisma, notifications);

    const result = await service.cancel(slotId, {});

    assert.equal(prisma.$transaction.calls.length, 1);
    assert.equal(notifications.notifyInstructorTrainingCancelled.calls.length, 1);
    assert.deepEqual(result, { id: slotId, status: BookingSlotStatus.available });
  }) ? passed++ : failed++;

  await run('BookingSlotsService.findAll forwards status filter, duration and student package', async () => {
    const prisma = {
      bookingSlot: {
        findMany: mockFn().mockResolvedValue([
          {
            id: slotId,
            startsAt: new Date('2026-06-04T09:00:00.000Z'),
            endsAt: new Date('2026-06-04T10:30:00.000Z'),
            student: {
              id: studentId,
              name: 'Алексей',
              packages: [
                {
                  id: 'package-1',
                  studentId,
                  type: 'gymkhana',
                  title: 'Джимхана',
                  totalSessions: 4,
                  usedSessions: 1,
                  paymentStatus: 'paid',
                  status: 'active',
                  purchasedAt: null,
                  expiresAt: null,
                  createdAt: new Date('2026-06-01T09:00:00.000Z'),
                  updatedAt: new Date('2026-06-01T09:00:00.000Z')
                }
              ]
            }
          }
        ])
      }
    } as any;
    const service = new BookingSlotsService(prisma, mockNotifications() as any);

    const result = await service.findAll({ status: BookingSlotStatus.available } as any);

    const where = prisma.bookingSlot.findMany.calls[0][0].where;
    assert.equal(where.AND.length, 2);
    assert.ok(where.AND[0].startsAt.gte instanceof Date);
    assert.deepEqual(where.AND[1], { status: BookingSlotStatus.available });
    assert.ok(prisma.bookingSlot.findMany.calls[0][0].include.student.select.packages);
    assert.equal(result[0].durationMinutes, 90);
    assert.equal(result[0].student.activePackage.name, 'Джимхана');
    assert.equal(result[0].student.activePackage.completedTrainings, 1);
    assert.equal(result[0].student.activePackage.totalTrainings, 4);
  }) ? passed++ : failed++;

  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
