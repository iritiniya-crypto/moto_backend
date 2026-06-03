import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstructorCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bookingSlot.findMany({
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
  }
}
