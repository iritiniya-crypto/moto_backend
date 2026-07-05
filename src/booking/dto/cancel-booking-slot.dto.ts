import { IsOptional, IsString } from 'class-validator';

export class CancelBookingSlotDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
