import { Module } from '@nestjs/common';
import { TrainingReportsController } from './training-reports.controller';
import { TrainingReportsService } from './training-reports.service';

@Module({
  controllers: [TrainingReportsController],
  providers: [TrainingReportsService]
})
export class ReportsModule {}
