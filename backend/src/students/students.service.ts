import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingPackageStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualTrainingHistoryDto } from './dto/create-manual-training-history.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpsertStudentSkillDto } from './dto/upsert-student-skills.dto';
import { UpsertTrainingPackageDto } from './dto/upsert-training-package.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const students = await this.prisma.student.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        instructor: {
          select: this.instructorSelect()
        },
        user: {
          select: {
            id: true,
            telegramId: true,
            telegramUsername: true,
            displayName: true,
            role: true
          }
        },
        packages: {
          orderBy: { createdAt: 'desc' }
        },
        skills: {
          include: {
            skill: true
          },
          orderBy: {
            skill: {
              name: 'asc'
            }
          }
        },
        trainingHistory: this.trainingHistoryInclude()
      }
    });

    return students.map((student) => this.toStudentHistoryResponse(student));
  }

  async findProfile(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        instructor: {
          select: this.instructorSelect()
        },
        user: {
          select: {
            id: true,
            telegramId: true,
            telegramUsername: true,
            displayName: true,
            role: true
          }
        },
        packages: {
          orderBy: { createdAt: 'desc' }
        },
        skills: {
          include: {
            skill: true
          },
          orderBy: {
            skill: {
              name: 'asc'
            }
          }
        },
        trainingHistory: this.trainingHistoryInclude(),
        videos: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) {
      throw new NotFoundException(`Student ${id} was not found`);
    }

    return this.toStudentHistoryResponse(student);
  }

  async create(dto: CreateStudentDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const instructorId = dto.instructorId ?? (await this.findDefaultInstructorOrThrow()).id;

        const user = await tx.user.create({
          data: {
            displayName: dto.name,
            telegramUsername: dto.telegramUsername,
            role: 'STUDENT'
          }
        });

        return tx.student.create({
          data: {
            userId: user.id,
            instructorId,
            name: dto.name,
            telegramUsername: dto.telegramUsername,
            level: dto.level,
            focus: dto.focus,
            nextTrainingPlan: dto.nextTrainingPlan
          },
          include: this.profileInclude()
        });
      });
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  async update(studentId: string, dto: UpdateStudentDto) {
    const student = await this.findStudentOrThrow(studentId);
    const instructorId =
      dto.instructorId !== undefined ? (await this.findInstructorOrThrow(dto.instructorId)).id : student.instructorId;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.name || dto.telegramUsername !== undefined) {
          await tx.user.update({
            where: { id: student.userId },
            data: {
              displayName: dto.name,
              telegramUsername: dto.telegramUsername
            }
          });
        }

        return tx.student.update({
          where: { id: studentId },
          data: {
            instructorId,
            name: dto.name,
            telegramUsername: dto.telegramUsername,
            level: dto.level,
            focus: dto.focus,
            nextTrainingPlan: dto.nextTrainingPlan
          },
          include: this.profileInclude()
        });
      });
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  async findPackage(studentId: string) {
    await this.findStudentOrThrow(studentId);

    const trainingPackage = await this.prisma.trainingPackage.findFirst({
      where: {
        studentId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    return trainingPackage ? this.toPackageResponse(trainingPackage) : null;
  }

  async upsertPackage(studentId: string, dto: UpsertTrainingPackageDto) {
    await this.findStudentOrThrow(studentId);

    if (dto.completedTrainings > dto.totalTrainings) {
      throw new BadRequestException('completedTrainings cannot be greater than totalTrainings');
    }

    const status = dto.isActive ? TrainingPackageStatus.active : TrainingPackageStatus.completed;
    const existing = await this.prisma.trainingPackage.findFirst({
      where: {
        studentId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = {
      title: `Пакет ${dto.totalTrainings} тренировок`,
      totalSessions: dto.totalTrainings,
      usedSessions: dto.completedTrainings,
      paymentStatus: dto.paymentStatus,
      status,
      purchasedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      expiresAt: dto.endedAt ? new Date(dto.endedAt) : null
    };

    const trainingPackage = existing
      ? await this.prisma.trainingPackage.update({
          where: { id: existing.id },
          data
        })
      : await this.prisma.trainingPackage.create({
          data: {
            studentId,
            ...data
          }
        });

    return this.toPackageResponse(trainingPackage);
  }

  async findSkills(studentId: string) {
    await this.findStudentOrThrow(studentId);

    const skills = await this.prisma.studentSkill.findMany({
      where: { studentId },
      orderBy: {
        skill: {
          name: 'asc'
        }
      },
      include: {
        skill: true
      }
    });

    return skills.map((item) => ({
      skillId: item.skillId,
      progressPercent: item.percent,
      skill: item.skill
    }));
  }

  async upsertSkills(studentId: string, skills: UpsertStudentSkillDto[]) {
    await this.findStudentOrThrow(studentId);

    const skillIds = skills.map((item) => item.skillId);
    if (new Set(skillIds).size !== skillIds.length) {
      throw new BadRequestException('skillId values must be unique');
    }

    const existingSkillsCount = await this.prisma.skill.count({
      where: {
        id: {
          in: skillIds
        }
      }
    });

    if (existingSkillsCount !== skillIds.length) {
      throw new NotFoundException('One or more skills were not found');
    }

    await this.prisma.$transaction(
      skills.map((item) =>
        this.prisma.studentSkill.upsert({
          where: {
            studentId_skillId: {
              studentId,
              skillId: item.skillId
            }
          },
          update: {
            percent: item.progressPercent
          },
          create: {
            studentId,
            skillId: item.skillId,
            percent: item.progressPercent
          }
        })
      )
    );

    return this.findSkills(studentId);
  }

  async createManualTrainingHistory(studentId: string, dto: CreateManualTrainingHistoryDto) {
    await this.findStudentOrThrow(studentId);

    return this.prisma.trainingHistory.create({
      data: {
        studentId,
        trainedAt: dto.trainedAt ? new Date(dto.trainedAt) : new Date(),
        summary: dto.summary
      },
      include: {
        videos: true,
        report: true,
        bookingSlot: true
      }
    });
  }

  private findStudentOrThrow(studentId: string) {
    return this.prisma.student.findUnique({ where: { id: studentId } }).then((student) => {
      if (!student) {
        throw new NotFoundException(`Student ${studentId} was not found`);
      }

      return student;
    });
  }

  private findDefaultInstructorOrThrow() {
    return this.prisma.instructor.findFirst({
      orderBy: { createdAt: 'asc' }
    }).then((instructor) => {
      if (!instructor) {
        throw new NotFoundException('Instructor was not found');
      }

      return instructor;
    });
  }

  private findInstructorOrThrow(instructorId: string) {
    return this.prisma.instructor.findUnique({ where: { id: instructorId } }).then((instructor) => {
      if (!instructor) {
        throw new NotFoundException(`Instructor ${instructorId} was not found`);
      }

      return instructor;
    });
  }

  private toPackageResponse(trainingPackage: {
    id: string;
    studentId: string;
    totalSessions: number;
    usedSessions: number;
    paymentStatus: string;
    status: string;
    purchasedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: trainingPackage.id,
      studentId: trainingPackage.studentId,
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

  private profileInclude() {
    return {
      user: {
        select: {
          id: true,
          telegramId: true,
          telegramUsername: true,
          displayName: true,
          role: true
        }
      },
      instructor: {
        select: this.instructorSelect()
      },
      packages: {
        orderBy: { createdAt: 'desc' as const }
      },
      skills: {
        include: {
          skill: true
        },
        orderBy: {
          skill: {
            name: 'asc' as const
          }
        }
      }
    };
  }

  private trainingHistoryInclude() {
    return {
      orderBy: { trainedAt: 'desc' as const },
      include: {
        report: true,
        videos: true,
        bookingSlot: true
      }
    };
  }

  private toStudentHistoryResponse<T extends { trainingHistory: unknown[] }>(student: T) {
    const historyCount = student.trainingHistory.length;

    return {
      ...student,
      history: student.trainingHistory,
      historyCount,
      completedTrainingsCount: historyCount,
      totalTrainings: historyCount
    };
  }

  private throwIfUniqueConflict(error: unknown) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Student with this telegramUsername already exists');
    }
  }

  private instructorSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      telegramUsername: true,
      userId: true,
      createdAt: true,
      updatedAt: true
    };
  }
}
