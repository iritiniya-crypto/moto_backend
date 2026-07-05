import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateManualTrainingHistoryDto {
  @IsOptional()
  @IsDateString()
  trainedAt?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
