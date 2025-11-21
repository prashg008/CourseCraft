import { Controller, Post, Query, Get } from '@nestjs/common';
import { CourseGenerationGateway } from './course-generation.gateway';

@Controller('ws/test')
export class TestController {
  constructor(private readonly gateway: CourseGenerationGateway) {}

  @Post('course')
  emitCourse(
    @Query('courseId') courseId: string,
    @Query('progress') progress = '10',
    @Query('message') message = 'test progress',
  ) {
    const p = Number(progress) || 10;
    this.gateway.emitCourseProgress(courseId, p, message);
    return { success: true, courseId, progress: p };
  }

  @Post('module')
  emitModule(
    @Query('courseId') courseId: string,
    @Query('moduleId') moduleId: string,
    @Query('progress') progress = '10',
    @Query('message') message = 'module test',
  ) {
    const p = Number(progress) || 10;
    this.gateway.emitModuleProgress(courseId, moduleId, p, message);
    return { success: true, moduleId, progress: p };
  }

  @Post('quiz')
  emitQuiz(
    @Query('courseId') courseId: string,
    @Query('quizId') quizId: string,
    @Query('progress') progress = '10',
    @Query('message') message = 'quiz test',
  ) {
    const p = Number(progress) || 10;
    this.gateway.emitQuizProgress(courseId, p, message, quizId);
    return { success: true, quizId, progress: p };
  }

  @Get('roomCount')
  getRoomCount(@Query('room') room: string) {
    try {
      const sockets = this.gateway.server.sockets.adapter.rooms.get(room);
      const count = sockets ? sockets.size : 0;
      return { success: true, room, count };
    } catch (e) {
      return { success: false, message: 'failed to read room', error: String(e) };
    }
  }
}
