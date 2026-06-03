import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class UpsertStudentSkillDto {
  @IsUUID()
  skillId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;
}

export class UpsertStudentSkillsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => UpsertStudentSkillDto)
  skills: UpsertStudentSkillDto[];
}
