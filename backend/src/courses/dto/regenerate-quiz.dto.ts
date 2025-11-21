import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegenerateQuizDto {
  @ApiProperty({
    description: 'Optional feedback for AI to improve the quiz',
    example: 'Make questions more challenging and add more MCQ questions',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
