import { Body, Controller, Get, Param, ParseArrayPipe, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { CreateManualTrainingHistoryDto } from './dto/create-manual-training-history.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpsertStudentSkillDto } from './dto/upsert-student-skills.dto';
import { UpsertTrainingPackageDto } from './dto/upsert-training-package.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':studentId')
  update(@Param('studentId', ParseUUIDPipe) studentId: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(studentId, dto);
  }

  @Get(':id/profile')
  findProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findProfile(id);
  }

  @Get(':studentId/package')
  findPackage(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentsService.findPackage(studentId);
  }

  @Put(':studentId/package')
  upsertPackage(@Param('studentId', ParseUUIDPipe) studentId: string, @Body() dto: UpsertTrainingPackageDto) {
    return this.studentsService.upsertPackage(studentId, dto);
  }

  @Get(':studentId/skills')
  findSkills(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentsService.findSkills(studentId);
  }

  @Put(':studentId/skills')
  upsertSkills(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body(new ParseArrayPipe({ items: UpsertStudentSkillDto })) skills: UpsertStudentSkillDto[]
  ) {
    return this.studentsService.upsertSkills(studentId, skills);
  }

  @Post(':studentId/training-history/manual')
  createManualTrainingHistory(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: CreateManualTrainingHistoryDto
  ) {
    return this.studentsService.createManualTrainingHistory(studentId, dto);
  }
}
