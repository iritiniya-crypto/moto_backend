import { Injectable } from '@nestjs/common';
import { withBookingSlotDurations } from '../booking/booking-slot-response';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstructorCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const slots = await this.prisma.bookingSlot.findMany({
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
            telegramUsername: true
          }
        },
        calendarEvents: {
          orderBy: { createdAt: 'desc' }
        },
        report: {
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    });

    return withBookingSlotDurations(slots);
  }
}
