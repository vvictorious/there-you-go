import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CurrentLocationDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class ReminderDto {
  @IsString()
  @Matches(/\S/, {
    message: 'reminder id must contain at least one non-whitespace character',
  })
  id!: string;

  @IsString()
  @Matches(/\S/, {
    message: 'reminder text must contain at least one non-whitespace character',
  })
  text!: string;
}

export class FindPlaceCandidatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  reminders!: ReminderDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => CurrentLocationDto)
  location!: CurrentLocationDto;
}
