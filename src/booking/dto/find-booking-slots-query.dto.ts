import { BookingSlotStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FindBookingSlotsQueryDto {
  @IsOptional()
  @IsEnum(BookingSlotStatus)
  status?: BookingSlotStatus;

  @IsOptional()
  @IsUUID()
  studentId?: string;
}
