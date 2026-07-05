import { StudentLevel } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTrainingReportDto {
  @IsUUID()
  slotId: string;

  @IsUUID()
  studentId: string;

  @IsArray()
  @IsString({ each: true })
  trainedSkills: string[];

  @IsString()
  improved: string;

  @IsString()
  nextFocus: string;

  @IsOptional()
  @IsEnum(StudentLevel)
  levelUpdate?: StudentLevel;
}
