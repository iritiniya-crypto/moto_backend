import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RescheduleBookingSlotDto {
  @IsDateString()
  startsAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(600)
  durationMinutes: number;

  @IsUUID()
  targetSlotId: string;

  @IsOptional()
  @IsString()
  instructorComment?: string;

  @IsOptional()
  @IsString()
  studentComment?: string;
}
