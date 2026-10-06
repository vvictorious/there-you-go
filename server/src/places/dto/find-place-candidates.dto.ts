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

export class FindPlaceCandidatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/\S/, {
    each: true,
    message: 'each reminder must contain at least one non-whitespace character',
  })
  reminders!: string[];

  @IsDefined()
  @ValidateNested()
  @Type(() => CurrentLocationDto)
  location!: CurrentLocationDto;
}
