import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationsService } from './notifications.service';
import { TrainingReminderService } from './training-reminder.service';

@Module({
  imports: [PrismaModule, TelegramModule],
  providers: [NotificationsService, TrainingReminderService, NotificationRetryService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
