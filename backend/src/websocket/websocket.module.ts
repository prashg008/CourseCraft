import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CourseGenerationGateway } from './course-generation.gateway';
import { GenerationSnapshotService } from './snapshot.service';
import { EventsModule } from '../common/events/events.module';
import { SnapshotController } from './snapshot.controller';
import { TestController } from './test.controller';
import { forwardRef } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret') || 'default-secret',
        signOptions: {
          expiresIn: configService.get('jwt.expiration') || '7d',
        },
      }),
    }),
    EventsModule,
    forwardRef(() => CoursesModule),
  ],
  controllers: [SnapshotController, TestController],
  providers: [CourseGenerationGateway, GenerationSnapshotService],
  exports: [CourseGenerationGateway, GenerationSnapshotService],
})
export class WebsocketModule {}
