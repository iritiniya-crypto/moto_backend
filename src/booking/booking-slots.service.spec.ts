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
    notifyInstructorTrainingCancelled: jest.fn()
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
          OR: [{ studentId: 'student-1' }, { status: 'available' }]
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
    prisma.bookingSlot.findUnique.mockResolvedValue({ id: 'slot-1', status: 'requested' });
    prisma.bookingSlot.update.mockResolvedValue({ id: 'slot-1', status: 'confirmed' });

    await service.confirm('slot-1', { finalLocation: 'new place' });

    expect(prisma.bookingSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slot-1' } })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirm for reschedule creates available slot for previous time', async () => {
    const previousStartsAt = new Date('2026-06-01T10:00:00.000Z');

    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'slot-1',
      status: BookingSlotStatus.reschedule,
      instructorId: 'instructor-1',
      previousStartsAt,
      previousDurationMinutes: 90
    });

    const tx = {
      bookingSlot: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'freed-slot' }),
        update: jest.fn().mockResolvedValue({ id: 'slot-1', status: 'confirmed' })
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
    expect(tx.bookingSlot.update).toHaveBeenCalled();
  });

  it('confirm for reschedule skips create when previous slot exists', async () => {
    prisma.bookingSlot.findUnique.mockResolvedValue({
      id: 'slot-1',
      status: BookingSlotStatus.reschedule,
      instructorId: 'instructor-1',
      previousStartsAt: new Date('2026-06-01T10:00:00.000Z'),
      previousDurationMinutes: 90
    });

    const tx = {
      bookingSlot: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-slot' }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'slot-1', status: 'confirmed' })
      }
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await service.confirm('slot-1', {});

    expect(tx.bookingSlot.create).not.toHaveBeenCalled();
    expect(tx.bookingSlot.update).toHaveBeenCalled();
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
