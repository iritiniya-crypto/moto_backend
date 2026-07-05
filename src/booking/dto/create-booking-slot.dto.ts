import { Type } from 'class-transformer';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class CreateBookingSlotDto {
  @IsDateString()
  startsAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(600)
  durationMinutes: number;
}
