import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingPackageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingReportDto } from './dto/create-training-report.dto';

@Injectable()
export class TrainingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTrainingReportDto) {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.bookingSlot.findUnique({
        where: { id: dto.slotId }
      });

      if (!slot) {
        throw new NotFoundException(`Booking slot ${dto.slotId} was not found`);
      }

      const existingReport = await tx.trainingReport.findUnique({
        where: { bookingSlotId: slot.id }
      });

      if (existingReport) {
        if (existingReport.studentId !== dto.studentId) {
          throw new ConflictException('Training report belongs to another student');
        }

        const [history, student, trainingPackage] = await Promise.all([
          tx.trainingHistory.findUnique({
            where: { reportId: existingReport.id }
          }),
          tx.student.findUnique({
            where: { id: existingReport.studentId }
          }),
          this.findActivePackage(tx, existingReport.studentId)
        ]);

        return {
          report: existingReport,
          trainingHistory: history,
          slot,
          student,
          trainingPackage: this.toPackageResponse(trainingPackage)
        };
      }

      if (slot.status !== 'confirmed') {
        throw new ConflictException('Training report can be created only for confirmed slots');
      }

      const student = await tx.student.findUnique({
        where: { id: dto.studentId }
      });

      if (!student) {
        throw new NotFoundException(`Student ${dto.studentId} was not found`);
      }

      if (slot.studentId && slot.studentId !== dto.studentId) {
        throw new ConflictException('Slot belongs to another student');
      }

      const report = await tx.trainingReport.create({
        data: {
          bookingSlotId: slot.id,
          studentId: student.id,
          instructorId: slot.instructorId,
          trainedOn: dto.trainedSkills.join(', '),
          successes: dto.improved,
          focusNext: dto.nextFocus,
          levelChange: dto.levelUpdate
        }
      });

      const history = await tx.trainingHistory.create({
        data: {
          studentId: student.id,
          bookingSlotId: slot.id,
          reportId: report.id,
          trainedAt: slot.startsAt,
          summary: dto.improved
        }
      });

      const completedSlot = await tx.bookingSlot.update({
        where: { id: slot.id },
        data: {
          status: 'completed'
        }
      });

      const updatedStudent = dto.levelUpdate
        ? await tx.student.update({
            where: { id: student.id },
            data: { level: dto.levelUpdate }
          })
        : student;

      const activePackage = await this.findActivePackage(tx, student.id);
      const updatedPackage =
        activePackage && activePackage.usedSessions < activePackage.totalSessions
          ? await tx.trainingPackage.update({
              where: { id: activePackage.id },
              data: {
                usedSessions: {
                  increment: 1
                }
              }
            })
          : activePackage;

      return {
        report,
        trainingHistory: history,
        slot: completedSlot,
        student: updatedStudent,
        trainingPackage: this.toPackageResponse(updatedPackage)
      };
    });
  }

  private findActivePackage(tx: any, studentId: string) {
    return tx.trainingPackage.findFirst({
      where: {
        studentId,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  private toPackageResponse(trainingPackage: any) {
    if (!trainingPackage) {
      return null;
    }

    return {
      id: trainingPackage.id,
      studentId: trainingPackage.studentId,
      type: trainingPackage.type ?? TrainingPackageType.motorcycle,
      name: trainingPackage.name ?? this.packageTypeName(trainingPackage.type),
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

  private packageTypeName(type?: TrainingPackageType | string | null) {
    const packageNames: Record<string, string> = {
      [TrainingPackageType.scooter]: 'Скутер',
      [TrainingPackageType.motorcycle]: 'Мотоцикл',
      [TrainingPackageType.gymkhana]: 'Джимхана'
    };

    return packageNames[type ?? TrainingPackageType.motorcycle] ?? 'Мотоцикл';
  }
}
