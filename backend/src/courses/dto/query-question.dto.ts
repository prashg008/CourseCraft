import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryQuestionDto {
  @ApiPropertyOptional({
    description: 'Filter questions by course id',
    example: 'd4f3b480-3e06-4bde-9a8b-46b4d37b8d8f',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}
