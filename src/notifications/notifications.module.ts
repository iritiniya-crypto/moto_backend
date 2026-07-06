import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationsService } from './notifications.service';
import { TrainingReminderService } from './training-reminder.service';

@Module({
  imports: [TelegramModule],
  providers: [NotificationsService, TrainingReminderService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
