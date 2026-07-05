import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ConfirmBookingSlotDto {
  @IsOptional()
  @IsString()
  finalLocation?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  finalLocationUrl?: string;

  @IsOptional()
  @IsString()
  instructorComment?: string;
}
