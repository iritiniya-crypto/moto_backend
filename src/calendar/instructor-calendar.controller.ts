import { Controller, Get } from '@nestjs/common';
import { InstructorCalendarService } from './instructor-calendar.service';

@Controller('instructor/calendar')
export class InstructorCalendarController {
  constructor(private readonly instructorCalendarService: InstructorCalendarService) {}

  @Get()
  findAll() {
    return this.instructorCalendarService.findAll();
  }
}
