import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingSlotStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { withBookingSlotDuration, withBookingSlotDurations } from './booking-slot-response';
import { CancelBookingSlotDto } from './dto/cancel-booking-slot.dto';
import { ConfirmBookingSlotDto } from './dto/confirm-booking-slot.dto';
import { CreateBookingSlotDto } from './dto/create-booking-slot.dto';
import { FindBookingSlotsQueryDto } from './dto/find-booking-slots-query.dto';
import { RequestBookingSlotDto } from './dto/request-booking-slot.dto';
import { RescheduleBookingSlotDto } from './dto/reschedule-booking-slot.dto';
import { UpdateBookingSlotDto } from './dto/update-booking-slot.dto';

@Injectable()
export class BookingSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async findAll(query: FindBookingSlotsQueryDto = {}) {
    const filters: any[] = [
      {
        startsAt: {
          gte: this.getRollingMonthStart()
        }
      }
    ];

    if (query.studentId) {
      const studentFilter = {
        OR: [
          { studentId: query.studentId },
          { status: BookingSlotStatus.available }
        ]
      };

      filters.push(studentFilter);

      if (query.status) {
        filters.push({ status: query.status });
      }
    } else if (query.status) {
      filters.push({ status: query.status });
    }

    const where = filters.length === 1 ? filters[0] : { AND: filters };

    const slots = await this.prisma.bookingSlot.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
            level: true,
            packages: {
              where: {
                status: 'active'
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        },
        instructor: {
          select: {
            id: true,
            displayName: true,
            telegramUsername: true,
            role: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            displayName: true,
            telegramUsername: true,
            role: true
          }
        },
        report: {
          select: {
            id: true,
            trainedOn: true,
            successes: true,
            focusNext: true,
            levelChange: true,
            createdAt: true
          }
        },
        trainingRecord: true
      }
    });

    return withBookingSlotDurations(slots);
  }

  private getRollingMonthStart() {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  async create(dto: CreateBookingSlotDto) {
    const instructor = await this.findInstructorOrThrow();
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    const slot = await this.prisma.bookingSlot.create({
      data: {
        startsAt,
        endsAt,
        status: 'available',
        title: 'Свободный слот',
        instructorId: instructor.id
      }
    });

    return withBookingSlotDuration(slot);
  }

  async update(slotId: string, dto: UpdateBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertSlotStatus(slot.status, 'available', 'Only available slots can be edited');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : slot.startsAt;
    const endsAt = dto.durationMinutes ? new Date(startsAt.getTime() + dto.durationMinutes * 60_000) : slot.endsAt;

    const updatedSlot = await this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        startsAt,
        endsAt,
        title: dto.title,
        location: dto.location,
        notes: dto.notes
      }
    });

    return withBookingSlotDuration(updatedSlot);
  }

  async remove(slotId: string) {
    const slot = await this.findSlotOrThrow(slotId);

    if (slot.status === 'completed') {
      throw new ConflictException('Completed slots cannot be deleted');
    }

    this.assertSlotStatus(slot.status, 'available', 'Only available slots can be deleted');

    await this.prisma.bookingSlot.delete({
      where: { id: slotId }
    });

    return { deleted: true, id: slotId };
  }

  async request(slotId: string, dto: RequestBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertSlotStatus(slot.status, 'available', 'Only available slots can be requested');

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: {
        id: true,
        userId: true,
        name: true,
        telegramUsername: true
      }
    });

    if (!student) {
      throw new NotFoundException(`Student ${dto.studentId} was not found`);
    }

    const updatedSlot = await this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        status: 'requested',
        studentId: student.id,
        requestedById: student.userId,
        requestedAt: new Date(),
        preference: dto.preference,
        studentComment: dto.studentComment
      }
    });

    await this.notifications.notifyInstructorBookingRequested({
      studentName: student.name,
      telegramUsername: student.telegramUsername,
      startsAt: updatedSlot.startsAt,
      durationMinutes: Math.round((updatedSlot.endsAt.getTime() - updatedSlot.startsAt.getTime()) / 60_000),
      location: updatedSlot.location,
      preference: dto.preference,
      studentComment: dto.studentComment,
      slotId: updatedSlot.id,
      studentId: student.id
    });

    return withBookingSlotDuration(updatedSlot);
  }

  async confirm(slotId: string, dto: ConfirmBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertAnySlotStatus(slot.status, ['requested', 'reschedule'], 'Only requested or reschedule slots can be confirmed');

    const student = await this.prisma.student.findUnique({
      where: { id: slot.studentId || '' },
      select: {
        id: true,
        userId: true,
        name: true,
        telegramUsername: true
      }
    });

    const confirmationData = {
      status: BookingSlotStatus.confirmed,
      confirmedAt: new Date(),
      finalLocation: dto.finalLocation,
      finalLocationUrl: dto.finalLocationUrl,
      instructorComment: dto.instructorComment
    };

    if (slot.status !== BookingSlotStatus.reschedule) {
      const updatedSlot = await this.prisma.bookingSlot.update({
        where: { id: slotId },
        data: confirmationData
      });

      await this.notifications.notifyStudentTrainingApproved({
        studentName: student?.name || '',
        telegramUsername: student?.telegramUsername ?? null,
        startsAt: slot.startsAt,
        durationMinutes: Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000),
        location: confirmationData.finalLocation,
        slotId: slot.id,
        studentId: student?.id ?? null,
        studentTelegramChatId: student?.telegramUsername ?? null,
        approveType: "requestApproved"
      })

      return withBookingSlotDuration(updatedSlot);
    }

    if (!slot.previousStartsAt || !slot.previousDurationMinutes) {
      throw new ConflictException('Reschedule slot has no previous time to release');
    }

    const previousStartsAt = slot.previousStartsAt;
    const previousDurationMinutes = slot.previousDurationMinutes;
    const previousEndsAt = new Date(previousStartsAt.getTime() + previousDurationMinutes * 60_000);

    const { confirmedSlot, releasedSlot } = await this.prisma.$transaction(async (tx) => {
      const previousSlot = await tx.bookingSlot.findFirst({
        where: {
          id: { not: slot.id },
          instructorId: slot.instructorId,
          studentId: slot.studentId,
          startsAt: previousStartsAt,
          endsAt: previousEndsAt,
          status: BookingSlotStatus.confirmed
        }
      });

      const releasedSlot = previousSlot
        ? await tx.bookingSlot.update({
            where: { id: previousSlot.id },
            data: this.availableSlotData()
          })
        : await tx.bookingSlot.create({
            data: {
              startsAt: previousStartsAt,
              endsAt: previousEndsAt,
              status: BookingSlotStatus.available,
              title: 'Свободный слот',
              instructorId: slot.instructorId
            }
          });

      const confirmedSlot = await tx.bookingSlot.update({
        where: { id: slotId },
        data: {
          ...confirmationData,
          previousStartsAt: null,
          previousDurationMinutes: null
        }
      });

      return { confirmedSlot, releasedSlot };
    });

    await this.notifications.notifyStudentTrainingApproved({
      studentName: student?.name || '',
      telegramUsername: student?.telegramUsername ?? null,
      startsAt: confirmedSlot.startsAt,
      durationMinutes: Math.round((confirmedSlot.endsAt.getTime() - confirmedSlot.startsAt.getTime()) / 60_000),
      location: confirmedSlot.finalLocation,
      slotId: confirmedSlot.id,
      studentId: student?.id ?? null,
      studentTelegramChatId: student?.telegramUsername ?? null,
      approveType: "rescheduleApproved"
    })

    return withBookingSlotDurations([releasedSlot, confirmedSlot]);
  }

  async reschedule(slotId: string, dto: RescheduleBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertSlotStatus(slot.status, 'confirmed', 'Only confirmed slots can be rescheduled');

    if (!slot.studentId) {
      throw new ConflictException('Confirmed slot has no student to reschedule');
    }

    const targetSlot = await this.findSlotOrThrow(dto.targetSlotId);
    this.assertSlotStatus(targetSlot.status, 'available', 'Only available target slots can be requested for reschedule');

    const previousDurationMinutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000);

    const updatedSlot = await this.prisma.bookingSlot.update({
      where: { id: targetSlot.id },
      data: {
        status: BookingSlotStatus.reschedule,
        studentId: slot.studentId,
        requestedById: slot.requestedById,
        requestedAt: new Date(),
        preference: targetSlot.location ?? targetSlot.title,
        studentComment: dto.studentComment,
        finalLocation: null,
        finalLocationUrl: null,
        previousStartsAt: slot.startsAt,
        previousDurationMinutes,
        instructorComment: dto.instructorComment
      }
    });

    const student = slot.studentId
      ? await this.prisma.student.findUnique({
          where: { id: slot.studentId },
          select: {
            name: true,
            telegramUsername: true
          }
        })
      : null;

    if (student) {
      await this.notifications.notifyInstructorTrainingRescheduled({
        studentName: student.name,
        telegramUsername: student.telegramUsername,
        previousStartsAt: slot.startsAt,
        startsAt: updatedSlot.startsAt,
        durationMinutes: Math.round((updatedSlot.endsAt.getTime() - updatedSlot.startsAt.getTime()) / 60_000),
        location: updatedSlot.finalLocation ?? updatedSlot.location,
        slotId: updatedSlot.id,
        studentId: slot.studentId
      });
    }

    return withBookingSlotDuration(updatedSlot);
  }

  async decline(slotId: string) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertAnySlotStatus(slot.status, ['requested', 'reschedule'], 'Only requested or reschedule slots can be declined');

    const updatedSlot = await this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });

    return withBookingSlotDuration(updatedSlot);
  }

  async cancel(slotId: string, _dto: CancelBookingSlotDto = {}) {
    const { notificationPayload, updatedSlot } = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.bookingSlot.findUnique({
        where: { id: slotId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              telegramUsername: true
            }
          }
        }
      });

      if (!slot) {
        throw new NotFoundException(`Booking slot ${slotId} was not found`);
      }

      this.assertAnySlotStatus(
        slot.status,
        ['requested', 'reschedule', 'confirmed'],
        'Only requested, reschedule or confirmed slots can be cancelled by student'
      );

      if (!slot.student) {
        throw new ConflictException('Booking slot has no student to cancel');
      }

      const updatedSlot = await tx.bookingSlot.update({
        where: { id: slotId },
        data: this.availableSlotData()
      });

      const durationMinutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000);

      return {
        notificationPayload: {
          studentName: slot.student.name,
          telegramUsername: slot.student.telegramUsername,
          startsAt: slot.startsAt,
          durationMinutes,
          location: slot.finalLocation ?? slot.location,
          slotId: slot.id,
          studentId: slot.student.id
        },
        updatedSlot
      };
    });

    await this.notifications.notifyInstructorTrainingCancelled(notificationPayload);

    return withBookingSlotDuration(updatedSlot);
  }

  private async findSlotOrThrow(slotId: string) {
    const slot = await this.prisma.bookingSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      throw new NotFoundException(`Booking slot ${slotId} was not found`);
    }

    return slot;
  }

  private assertSlotStatus(actual: string, expected: string, message: string) {
    if (actual !== expected) {
      throw new ConflictException(message);
    }
  }

  private assertAnySlotStatus(actual: string, expected: string[], message: string) {
    if (!expected.includes(actual)) {
      throw new ConflictException(message);
    }
  }

  private availableSlotData() {
    return {
      status: BookingSlotStatus.available,
      studentId: null,
      requestedById: null,
      requestedAt: null,
      confirmedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      preference: null,
      studentComment: null,
      finalLocation: null,
      finalLocationUrl: null,
      instructorComment: null,
      previousStartsAt: null,
      previousDurationMinutes: null
    };
  }

  private async findInstructorOrThrow() {
    const instructor = await this.prisma.user.findFirst({
      where: { role: 'INSTRUCTOR' },
      orderBy: { createdAt: 'asc' }
    });

    if (!instructor) {
      throw new NotFoundException('Instructor was not found');
    }

    return instructor;
  }
}
