import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationTask } from './entities/generation-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GenerationTask])],
  exports: [TypeOrmModule],
})
export class GenerationTasksModule {}
