import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InstructorsService } from './instructors.service';

@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get()
  findAll() {
    return this.instructorsService.findAll();
  }

  @Get(':id/profile')
  findProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.instructorsService.findProfile(id);
  }
}

