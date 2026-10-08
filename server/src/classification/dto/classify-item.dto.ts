import { IsString, Matches, MaxLength } from 'class-validator';

export const MAX_CLASSIFICATION_TEXT_LENGTH = 500;

export class ClassifyItemDto {
  @IsString()
  @Matches(/\S/, {
    message: 'text must contain at least one non-whitespace character',
  })
  @MaxLength(MAX_CLASSIFICATION_TEXT_LENGTH)
  text!: string;
}
