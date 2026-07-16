import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingSlotStatus } from '@prisma/client';
import { BookingSlotsService } from './booking-slots.service';

describe('BookingSlotsService', () => {
  const prisma = {
    bookingSlot: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn()
    },
    student: {
      findUnique: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    },
    $transaction: jest.fn()
  };

  const notifications = {
    notifyInstructorBookingRequested: jest.fn(),
    notifyInstructorTrainingRescheduled: jest.fn(),
    notifyInstructorTrainingReminder: jest.fn(),
    notifyInstructorStudentCreated: jest.fn(),
    notifyInstructorTrainingCancelled: jest.fn(),
    notifyStudentTrainingApproved: jest.fn(),
  };

  const service = new BookingSlotsService(prisma as any, notifications as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findAll filters by studentId with available slots', async () => {
    prisma.bookingSlot.findMany.mockResolvedValue([]);

    await service.findAll({ studentId: 'student-1' });

    expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              startsAt: {
                gte: expect.any(Date)
              }
            },
            {
              OR: [{ studentId: 'student-1' }, { status: BookingSlotStatus.available }]
            }
          ]
        }
      })
    );
  });

  it('create computes endsAt and uses instructor', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'instructor-1' });
    prisma.bookingSlot.create.mockResolvedValue({ id: 'slot-1' });

    await service.create({ startsAt: '2026-06-01T10:00:00.000Z', durationMinutes: 90 });

    expect(prisma.bookingSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'available',
          instructorId: 'instructor-1'
        })
      })
    );
  });

  it('request throws when student not found', async () => {
    prisma.bookingSlot.findUnique.mockResolvedValue({ id: 'slot-1', status: 'available' });
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.request('slot-1', { studentId: 'student-1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove throws for completed slot', async () => {
    prisma.bookingSlot.findUnique.mockResolvedValue({ id: 'slot-1', status: 'completed' });

    await expect(service.remove('slot-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirm for requested updates slot without transaction', async () => {
    const startsAt = new Date('2026-06-01T10:00:00.000Z');
    const endsAt = new Date('2026-06-01T11:30:00.000Z');
    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'slot-1',
      status: 'requested',
      startsAt,
      endsAt,
      studentId: 'student-1'
    });
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      name: 'Alex',
      telegramUsername: 'alex_user',
      user: { telegramId: 'chat-1' }
    });
    prisma.bookingSlot.update.mockResolvedValue({ id: 'slot-1', status: 'confirmed' });

    await service.confirm('slot-1', { finalLocation: 'new place' });

    expect(prisma.bookingSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slot-1' } })
    );
    expect(notifications.notifyStudentTrainingApproved).toHaveBeenCalledWith({
      studentName: 'Alex',
      telegramUsername: 'alex_user',
      startsAt,
      durationMinutes: 90,
      location: 'new place',
      slotId: 'slot-1',
      studentId: 'student-1',
      studentTelegramChatId: 'chat-1',
      approveType: 'requestApproved'
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirm for reschedule releases previous confirmed slot and confirms target slot', async () => {
    const previousStartsAt = new Date('2026-06-01T10:00:00.000Z');
    const previousEndsAt = new Date('2026-06-01T11:30:00.000Z');
    const newStartsAt = new Date('2026-06-02T10:00:00.000Z');
    const newEndsAt = new Date('2026-06-02T11:30:00.000Z');

    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'target-slot',
      status: BookingSlotStatus.reschedule,
      instructorId: 'instructor-1',
      studentId: 'student-1',
      previousStartsAt,
      previousDurationMinutes: 90
    });
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      name: 'Alex',
      telegramUsername: 'alex_user',
      user: { telegramId: 'chat-1' }
    });

    const tx = {
      bookingSlot: {
        findFirst: jest.fn().mockResolvedValue({ id: 'previous-slot' }),
        update: jest
          .fn()
          .mockResolvedValueOnce({ id: 'previous-slot', status: BookingSlotStatus.available })
          .mockResolvedValueOnce({
            id: 'target-slot',
            status: BookingSlotStatus.confirmed,
            startsAt: newStartsAt,
            endsAt: newEndsAt,
            finalLocation: 'new place'
          })
      }
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await service.confirm('target-slot', {});

    expect(tx.bookingSlot.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: 'target-slot' },
        instructorId: 'instructor-1',
        studentId: 'student-1',
        startsAt: previousStartsAt,
        endsAt: previousEndsAt,
        status: BookingSlotStatus.confirmed
      }
    });
    expect(tx.bookingSlot.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'previous-slot' },
        data: expect.objectContaining({ status: BookingSlotStatus.available })
      })
    );
    expect(tx.bookingSlot.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'target-slot' },
        data: expect.objectContaining({ status: BookingSlotStatus.confirmed })
      })
    );
    expect(notifications.notifyStudentTrainingApproved).toHaveBeenCalledWith({
      studentName: 'Alex',
      telegramUsername: 'alex_user',
      startsAt: newStartsAt,
      durationMinutes: 90,
      location: 'new place',
      slotId: 'target-slot',
      studentId: 'student-1',
      studentTelegramChatId: 'chat-1',
      approveType: 'rescheduleApproved'
    });
  });

  it('confirm for legacy reschedule creates available previous slot when confirmed source is missing', async () => {
    const previousStartsAt = new Date('2026-06-01T10:00:00.000Z');
    const newStartsAt = new Date('2026-06-02T10:00:00.000Z');
    const newEndsAt = new Date('2026-06-02T11:30:00.000Z');

    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'slot-1',
      status: BookingSlotStatus.reschedule,
      instructorId: 'instructor-1',
      studentId: 'student-1',
      previousStartsAt,
      previousDurationMinutes: 90
    });
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      name: 'Alex',
      telegramUsername: 'alex_user',
      user: { telegramId: 'chat-1' }
    });

    const tx = {
      bookingSlot: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'legacy-available-slot', status: BookingSlotStatus.available }),
        update: jest.fn().mockResolvedValue({
          id: 'slot-1',
          status: BookingSlotStatus.confirmed,
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          finalLocation: 'new place'
        })
      }
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await service.confirm('slot-1', {});

    expect(tx.bookingSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startsAt: previousStartsAt,
          status: BookingSlotStatus.available,
          instructorId: 'instructor-1'
        })
      })
    );
    expect(tx.bookingSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'slot-1' },
        data: expect.objectContaining({ status: BookingSlotStatus.confirmed })
      })
    );
    expect(notifications.notifyStudentTrainingApproved).toHaveBeenCalledWith({
      studentName: 'Alex',
      telegramUsername: 'alex_user',
      startsAt: newStartsAt,
      durationMinutes: 90,
      location: 'new place',
      slotId: 'slot-1',
      studentId: 'student-1',
      studentTelegramChatId: 'chat-1',
      approveType: 'rescheduleApproved'
    });
  });

  it('confirm for reschedule without previous data throws conflict', async () => {
    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'slot-1',
      status: BookingSlotStatus.reschedule,
      previousStartsAt: null,
      previousDurationMinutes: null
    });

    await expect(service.confirm('slot-1', {})).rejects.toBeInstanceOf(ConflictException);
  });
});
