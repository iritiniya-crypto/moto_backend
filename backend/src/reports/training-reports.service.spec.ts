import { ConflictException, NotFoundException } from '@nestjs/common';
import { TrainingReportsService } from './training-reports.service';

describe('TrainingReportsService', () => {
  const prisma = {
    $transaction: jest.fn()
  };

  const service = new TrainingReportsService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when slot not found', async () => {
    const tx = {
      bookingSlot: { findUnique: jest.fn().mockResolvedValue(null) },
      student: { findUnique: jest.fn() },
      trainingReport: { create: jest.fn() },
      trainingHistory: { create: jest.fn() }
    };
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(
      service.create({
        slotId: 'slot-1',
        studentId: 'student-1',
        trainedSkills: [],
        improved: 'ok',
        nextFocus: 'next'
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when slot is not confirmed', async () => {
    const tx = {
      bookingSlot: { findUnique: jest.fn().mockResolvedValue({ id: 'slot-1', status: 'requested' }) },
      student: { findUnique: jest.fn() }
    };
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(
      service.create({
        slotId: 'slot-1',
        studentId: 'student-1',
        trainedSkills: [],
        improved: 'ok',
        nextFocus: 'next'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates report, history and completes slot', async () => {
    const slot = {
      id: 'slot-1',
      status: 'confirmed',
      studentId: 'student-1',
      instructorId: 'instructor-1',
      startsAt: new Date('2026-06-01T10:00:00.000Z')
    };

    const tx = {
      bookingSlot: {
        findUnique: jest.fn().mockResolvedValue(slot),
        update: jest.fn().mockResolvedValue({ id: 'slot-1', status: 'completed' })
      },
      student: {
        findUnique: jest.fn().mockResolvedValue({ id: 'student-1', level: 'BEGINNER' }),
        update: jest.fn().mockResolvedValue({ id: 'student-1', level: 'INTERMEDIATE' })
      },
      trainingReport: {
        create: jest.fn().mockResolvedValue({ id: 'report-1' })
      },
      trainingHistory: {
        create: jest.fn().mockResolvedValue({ id: 'history-1' })
      }
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await service.create({
      slotId: 'slot-1',
      studentId: 'student-1',
      trainedSkills: ['Овал', 'Торможение'],
      improved: 'better',
      nextFocus: 'next',
      levelUpdate: 'INTERMEDIATE'
    } as any);

    expect(tx.trainingReport.create).toHaveBeenCalled();
    expect(tx.trainingHistory.create).toHaveBeenCalled();
    expect(tx.bookingSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'completed' }
    });
    expect(tx.student.update).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        report: { id: 'report-1' },
        trainingHistory: { id: 'history-1' }
      })
    );
  });
});

