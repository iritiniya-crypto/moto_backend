import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateTrainingVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsUrl({ require_protocol: true })
  telegramUrl: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
