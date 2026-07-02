import { TrainingPackagePaymentStatus, TrainingPackageType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpsertTrainingPackageDto {
  @IsOptional()
  @IsEnum(TrainingPackageType)
  type?: TrainingPackageType;

  @IsOptional()
  @IsIn(['Скутер', 'Мотоцикл', 'Джимхана'])
  name?: string;

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
