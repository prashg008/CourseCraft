import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CourseGenerationGateway } from './course-generation.gateway';

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
  ],
  providers: [CourseGenerationGateway],
  exports: [CourseGenerationGateway],
})
export class WebsocketModule {}
