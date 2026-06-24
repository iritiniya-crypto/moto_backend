import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingSlotStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
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

  findAll(query: FindBookingSlotsQueryDto = {}) {
    const where: any = {};

    if (query.studentId) {
      const studentFilter = {
        OR: [
          { studentId: query.studentId },
          { status: 'available' }
        ]
      };

      if (query.status) {
        where.AND = [studentFilter, { status: query.status }];
      } else {
        where.OR = studentFilter.OR;
      }
    } else if (query.status) {
      where.status = query.status;
    }

    return this.prisma.bookingSlot.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
            level: true
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
  }

  async create(dto: CreateBookingSlotDto) {
    const instructor = await this.findInstructorOrThrow();
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    return this.prisma.bookingSlot.create({
      data: {
        startsAt,
        endsAt,
        status: 'available',
        title: 'Свободный слот',
        instructorId: instructor.id
      }
    });
  }

  async update(slotId: string, dto: UpdateBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertSlotStatus(slot.status, 'available', 'Only available slots can be edited');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : slot.startsAt;
    const endsAt = dto.durationMinutes ? new Date(startsAt.getTime() + dto.durationMinutes * 60_000) : slot.endsAt;

    return this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        startsAt,
        endsAt,
        title: dto.title,
        location: dto.location,
        notes: dto.notes
      }
    });
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
      where: { id: dto.studentId }
    });

    if (!student) {
      throw new NotFoundException(`Student ${dto.studentId} was not found`);
    }

    return this.prisma.bookingSlot.update({
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
  }

  async confirm(slotId: string, dto: ConfirmBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertAnySlotStatus(slot.status, ['requested', 'reschedule'], 'Only requested or reschedule slots can be confirmed');

    const confirmationData = {
      status: BookingSlotStatus.confirmed,
      confirmedAt: new Date(),
      finalLocation: dto.finalLocation,
      finalLocationUrl: dto.finalLocationUrl,
      instructorComment: dto.instructorComment
    };

    if (slot.status !== BookingSlotStatus.reschedule) {
      return this.prisma.bookingSlot.update({
        where: { id: slotId },
        data: confirmationData
      });
    }

    if (!slot.previousStartsAt || !slot.previousDurationMinutes) {
      throw new ConflictException('Reschedule slot has no previous time to release');
    }

    const previousStartsAt = slot.previousStartsAt;
    const previousDurationMinutes = slot.previousDurationMinutes;
    const previousEndsAt = new Date(previousStartsAt.getTime() + previousDurationMinutes * 60_000);

    return this.prisma.$transaction(async (tx) => {

      const existingPreviousTimeSlot = await tx.bookingSlot.findFirst({
        where: {
          id: { not: slot.id },
          instructorId: slot.instructorId,
          startsAt: previousStartsAt,
          endsAt: previousEndsAt
        }
      });

      if (!existingPreviousTimeSlot) {
        await tx.bookingSlot.create({
          data: {
            startsAt: previousStartsAt,
            endsAt: previousEndsAt,
            status: BookingSlotStatus.available,
            title: 'Свободный слот',
            instructorId: slot.instructorId
          }
        });
      }

      await tx.bookingSlot.deleteMany({
        where: {
          id: { not: slot.id },
          instructorId: slot.instructorId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: 'available'
        }
      });

      return tx.bookingSlot.update({
        where: { id: slotId },
        data: confirmationData
      });
    });
  }

  async reschedule(slotId: string, dto: RescheduleBookingSlotDto) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertSlotStatus(slot.status, 'confirmed', 'Only confirmed slots can be rescheduled');

    const previousDurationMinutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    return this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        startsAt,
        endsAt,
        status: BookingSlotStatus.reschedule,
        previousStartsAt: slot.startsAt,
        previousDurationMinutes,
        instructorComment: dto.instructorComment
      }
    });
  }

  async decline(slotId: string) {
    const slot = await this.findSlotOrThrow(slotId);
    this.assertAnySlotStatus(slot.status, ['requested', 'reschedule'], 'Only requested or reschedule slots can be declined');

    return this.prisma.bookingSlot.update({
      where: { id: slotId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });
  }

  async cancel(slotId: string, _dto: CancelBookingSlotDto = {}) {
    const { notificationPayload, updatedSlot } = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.bookingSlot.findUnique({
        where: { id: slotId },
        include: {
          student: {
            select: {
              id: true,
              name: true
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
          startsAt: slot.startsAt,
          durationMinutes,
          location: slot.finalLocation ?? slot.location,
          slotId: slot.id
        },
        updatedSlot
      };
    });

    await this.notifications.notifyInstructorTrainingCancelled(notificationPayload);

    return updatedSlot;
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
