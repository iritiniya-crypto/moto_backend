import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class TrainingReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrainingReminderService.name);
  private readonly sentSlotIds = new Set<string>();
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('TELEGRAM_REMINDERS_ENABLED', true)) {
      this.logger.log('Training reminders are disabled');
      return;
    }

    this.interval = setInterval(() => {
      void this.sendUpcomingTrainingReminders();
    }, this.config.get<number>('TELEGRAM_REMINDER_POLL_INTERVAL_MS', 60_000));

    void this.sendUpcomingTrainingReminders();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async sendUpcomingTrainingReminders() {
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60_000);
    const to = new Date(now.getTime() + 65 * 60_000);

    const slots = await this.prisma.bookingSlot.findMany({
      where: {
        status: 'confirmed',
        startsAt: {
          gte: from,
          lt: to
        },
        studentId: {
          not: null
        }
      },
      include: {
        student: {
          select: {
            name: true,
            telegramUsername: true
          }
        }
      },
      orderBy: { startsAt: 'asc' }
    });

    for (const slot of slots) {
      if (this.sentSlotIds.has(slot.id) || !slot.student) {
        continue;
      }

      this.sentSlotIds.add(slot.id);

      await this.notifications.notifyInstructorTrainingReminder({
        studentName: slot.student.name,
        telegramUsername: slot.student.telegramUsername,
        startsAt: slot.startsAt,
        durationMinutes: Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000),
        location: slot.finalLocation ?? slot.location,
        slotId: slot.id
      });
    }
  }
}
