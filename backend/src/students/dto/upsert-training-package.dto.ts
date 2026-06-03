import { TrainingPackagePaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpsertTrainingPackageDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  totalTrainings: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  completedTrainings: number;

  @IsEnum(TrainingPackagePaymentStatus)
  paymentStatus: TrainingPackagePaymentStatus;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsBoolean()
  isActive: boolean;
}
