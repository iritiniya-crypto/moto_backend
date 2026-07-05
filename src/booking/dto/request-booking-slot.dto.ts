import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestBookingSlotDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsString()
  preference?: string;

  @IsOptional()
  @IsString()
  studentComment?: string;
}
