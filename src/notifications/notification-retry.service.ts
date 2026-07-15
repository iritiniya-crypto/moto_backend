import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class NotificationRetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRetryService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramBotService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('TELEGRAM_NOTIFICATION_RETRY_ENABLED', true)) {
      this.logger.log('Telegram notification retry is disabled');
      return;
    }

    this.interval = setInterval(() => {
      void this.retryFailedTelegramNotifications();
    }, this.config.get<number>('TELEGRAM_NOTIFICATION_RETRY_INTERVAL_MS', 300_000));
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async retryFailedTelegramNotifications() {
    if (!this.telegram.getStatus().configured) {
      return { attempted: 0, sent: 0, failed: 0, skipped: 0 };
    }

    const limit = this.config.get<number>('TELEGRAM_NOTIFICATION_RETRY_BATCH_SIZE', 20);
    const notifications = await this.prisma.notification.findMany({
      where: {
        channel: 'telegram',
        status: {
          in: ['failed', 'pending']
        }
      },
      orderBy: {
        updatedAt: 'asc'
      },
      take: limit
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const notification of notifications) {
      const target = this.resolveTarget(notification.recipientRole, notification.recipientTelegramChatId);

      if (!target) {
        skipped++;
        continue;
      }

      try {
        const delivery = target === 'instructor'
          ? await this.telegram.sendInstructorMessage(notification.message)
          : await this.telegram.sendMessageToChat(target, notification.message);

        if (delivery.delivered) {
          sent++;
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });
        } else {
          failed++;
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'failed',
              sentAt: null
            }
          });
        }
      } catch (error) {
        failed++;
        this.logger.error('Failed to retry Telegram notification', error);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'failed',
            sentAt: null
          }
        });
      }
    }

    return {
      attempted: notifications.length,
      sent,
      failed,
      skipped
    };
  }

  private resolveTarget(recipientRole: string, recipientTelegramChatId?: string | null) {
    if (recipientRole === 'instructor') {
      return this.telegram.getStatus().instructorChatConfigured ? 'instructor' : null;
    }

    return recipientTelegramChatId ?? null;
  }
}
