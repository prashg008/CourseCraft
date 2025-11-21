import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegenerateModuleDto {
  @ApiProperty({
    description: 'Optional feedback for AI to improve the module',
    example: 'Add more examples and practical exercises',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
