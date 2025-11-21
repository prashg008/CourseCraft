import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '../entities/question.entity';

export class CreateAnswerDto {
  @ApiProperty({
    description: 'Answer text',
    example: 'TypeScript is a superset of JavaScript',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Whether this answer is correct',
    example: true,
  })
  @IsBoolean()
  @Transform(({ value, obj }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (obj && typeof (obj as { is_correct?: unknown }).is_correct === 'boolean') {
      return (obj as { is_correct?: boolean }).is_correct;
    }

    return undefined;
  })
  isCorrect: boolean;

  @ApiProperty({
    description: 'Order of the answer',
    example: 0,
  })
  @IsInt()
  @Min(0)
  order: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is TypeScript?',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Question type',
    enum: QuestionType,
    example: QuestionType.SINGLE_CHOICE,
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'Display order within the quiz',
    example: 0,
  })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    description: 'Answers for this question',
    type: [CreateAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}
