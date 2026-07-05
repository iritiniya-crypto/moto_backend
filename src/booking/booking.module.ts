import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingSlotsController } from './booking-slots.controller';
import { BookingSlotsService } from './booking-slots.service';

@Module({
  imports: [NotificationsModule],
  controllers: [BookingSlotsController],
  providers: [BookingSlotsService]
})
export class BookingModule {}
