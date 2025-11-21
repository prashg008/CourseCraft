import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Allow, IsUUID, ValidateIf } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';

export class CreateQuestionWithCourseDto extends CreateQuestionDto {
  @ApiPropertyOptional({
    description: 'Legacy field used by older clients; will be mapped to quizId',
    deprecated: true,
    example: 'd05241fa-e374-47e0-aaf9-faab09da095c',
    writeOnly: true,
  })
  @Allow()
  quiz?: string;

  @ApiPropertyOptional({
    description: 'Course identifier that owns the quiz',
    example: 'd4f3b480-3e06-4bde-9a8b-46b4d37b8d8f',
  })
  @ValidateIf((object: CreateQuestionWithCourseDto) => !object.quizId)
  @Transform(({ value, obj }) => {
    if (typeof value === 'string') {
      return value;
    }

    if (obj && typeof (obj as { course?: unknown }).course === 'string') {
      return (obj as { course?: string }).course;
    }

    return undefined;
  })
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Quiz identifier (use when courseId is not available)',
    example: 'd05241fa-e374-47e0-aaf9-faab09da095c',
  })
  @ValidateIf((object: CreateQuestionWithCourseDto) => !object.courseId)
  @Transform(({ value, obj }) => {
    if (typeof value === 'string') {
      return value;
    }

    if (obj && typeof (obj as { quiz?: unknown }).quiz === 'string') {
      return (obj as { quiz?: string }).quiz;
    }

    return undefined;
  })
  @IsUUID()
  quizId?: string;
}
