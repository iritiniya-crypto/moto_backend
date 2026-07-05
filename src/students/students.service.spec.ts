import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  const prisma = {
    student: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    user: {
      create: jest.fn(),
      update: jest.fn()
    },
    trainingPackage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    studentSkill: {
      findMany: jest.fn(),
      upsert: jest.fn()
    },
    skill: {
      count: jest.fn()
    },
    trainingHistory: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  };

  const service = new StudentsService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findAll requests nested data', async () => {
    prisma.student.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
        include: expect.any(Object)
      })
    );
  });

  it('findProfile throws when student not found', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await expect(service.findProfile('student-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create creates user and student in transaction', async () => {
    const tx = {
      user: { create: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      student: { create: jest.fn().mockResolvedValue({ id: 'student-1' }) }
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await service.create({
      name: 'Ivan',
      telegramUsername: 'ivan',
      level: 'BEGINNER',
      focus: 'focus',
      nextTrainingPlan: 'plan'
    } as any);

    expect(tx.user.create).toHaveBeenCalled();
    expect(tx.student.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'student-1' });
  });

  it('create maps P2002 to conflict', async () => {
    const err = new PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test'
    });
    prisma.$transaction.mockRejectedValue(err);

    await expect(service.create({ name: 'Ivan', level: 'BEGINNER' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('upsertPackage validates completedTrainings <= totalTrainings', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });

    await expect(
      service.upsertPackage('student-1', {
        totalTrainings: 1,
        completedTrainings: 2,
        paymentStatus: 'paid',
        isActive: true
      } as any)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upsertSkills validates unique skill ids', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });

    await expect(
      service.upsertSkills('student-1', [
        { skillId: 'skill-1', progressPercent: 10 },
        { skillId: 'skill-1', progressPercent: 20 }
      ])
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upsertSkills validates skill existence', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.skill.count.mockResolvedValue(1);

    await expect(
      service.upsertSkills('student-1', [
        { skillId: 'skill-1', progressPercent: 10 },
        { skillId: 'skill-2', progressPercent: 20 }
      ])
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createManualTrainingHistory uses current date when trainedAt is absent', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.trainingHistory.create.mockResolvedValue({ id: 'history-1' });

    await service.createManualTrainingHistory('student-1', { summary: 'manual' });

    expect(prisma.trainingHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-1',
          summary: 'manual',
          trainedAt: expect.any(Date)
        })
      })
    );
  });
});

