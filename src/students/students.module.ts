import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [NotificationsModule],
  controllers: [StudentsController],
  providers: [StudentsService]
})
export class StudentsModule {}
