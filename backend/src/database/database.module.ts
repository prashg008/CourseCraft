import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Module as CourseModule } from '../courses/entities/module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Quiz } from '../courses/entities/quiz.entity';
import { Question } from '../courses/entities/question.entity';
import { Answer } from '../courses/entities/answer.entity';
import { GenerationTask } from '../generation-tasks/entities/generation-task.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [User, Course, CourseModule, Lesson, Quiz, Question, Answer, GenerationTask],
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        // Connection pool settings
        extra: {
          max: 10, // Maximum number of clients in the pool
          min: 2, // Minimum number of clients in the pool
          idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
          connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection could not be established
        },
        // Migrations
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
