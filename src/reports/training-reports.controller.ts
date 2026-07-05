import { Body, Controller, Post } from '@nestjs/common';
import { CreateTrainingReportDto } from './dto/create-training-report.dto';
import { TrainingReportsService } from './training-reports.service';

@Controller('training-reports')
export class TrainingReportsController {
  constructor(private readonly trainingReportsService: TrainingReportsService) {}

  @Post()
  create(@Body() dto: CreateTrainingReportDto) {
    return this.trainingReportsService.create(dto);
  }
}
