import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

      return {
        report,
        trainingHistory: history,
        slot: completedSlot,
        student: updatedStudent
      };
    });
  }
}
