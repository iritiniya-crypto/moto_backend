import { Module } from '@nestjs/common';
import { InstructorCalendarController } from './instructor-calendar.controller';
import { InstructorCalendarService } from './instructor-calendar.service';

@Module({
  controllers: [InstructorCalendarController],
  providers: [InstructorCalendarService]
})
export class CalendarModule {}
