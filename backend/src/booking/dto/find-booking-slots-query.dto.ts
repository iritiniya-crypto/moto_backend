import { BookingSlotStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FindBookingSlotsQueryDto {
  @IsOptional()
  @IsEnum(BookingSlotStatus)
  status?: BookingSlotStatus;
}
