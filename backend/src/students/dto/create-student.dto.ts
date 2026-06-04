import { StudentLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  telegramUsername?: string;

  @IsEnum(StudentLevel)
  level: StudentLevel;

  @IsOptional()
  @IsString()
  focus?: string;

  @IsOptional()
  @IsString()
  nextTrainingPlan?: string;

  @IsOptional()
  @IsUUID()
  instructorId?: string;
}
