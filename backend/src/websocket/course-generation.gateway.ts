import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (
      process.env.SOCKET_IO_CORS_ORIGIN ||
      process.env.CORS_ORIGIN ||
      'http://localhost:5173'
    )
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
  namespace: '/ws',
})
export class CourseGenerationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CourseGenerationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Attach userId to socket
      client.userId = payload.sub;

      this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);
    } catch (error: any) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
  }

  @SubscribeMessage('joinCourse')
  handleJoinCourse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    const { courseId } = data;
    const roomName = `course:${courseId}`;

    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room: ${roomName}`);

    return { success: true, message: `Joined course ${courseId}` };
  }

  @SubscribeMessage('leaveCourse')
  handleLeaveCourse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    const { courseId } = data;
    const roomName = `course:${courseId}`;

    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room: ${roomName}`);

    return { success: true, message: `Left course ${courseId}` };
  }

  // Handle subscribe messages from frontend (maps to joinCourse)
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { event: string; id?: string },
  ) {
    const { event, id } = data;

    if (!id) {
      return { success: false, message: 'ID is required for subscription' };
    }

    // Map event types to room names
    let roomName: string;
    if (event === 'course:generation') {
      roomName = `course:${id}`;
    } else if (event === 'module:generation') {
      roomName = `course:${id}`; // Modules emit to course room
    } else if (event === 'quiz:generation') {
      roomName = `course:${id}`; // Quiz emits to course room
    } else {
      return { success: false, message: `Unknown event type: ${event}` };
    }

    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to ${event} (room: ${roomName})`);

    return { success: true, message: `Subscribed to ${event}` };
  }

  // Handle unsubscribe messages from frontend
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { event: string; id?: string },
  ) {
    const { event, id } = data;

    if (!id) {
      return { success: false, message: 'ID is required for unsubscription' };
    }

    let roomName: string;
    if (event === 'course:generation') {
      roomName = `course:${id}`;
    } else if (event === 'module:generation') {
      roomName = `course:${id}`;
    } else if (event === 'quiz:generation') {
      roomName = `course:${id}`;
    } else {
      return { success: false, message: `Unknown event type: ${event}` };
    }

    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from ${event} (room: ${roomName})`);

    return { success: true, message: `Unsubscribed from ${event}` };
  }

  // Emit progress updates to a specific course room
  emitCourseProgress(courseId: string, progress: number, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('course:generation', {
      courseId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted course:generation to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit completion notification
  emitCourseComplete(courseId: string, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('course:generation', {
      courseId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted course:generation (complete) to ${roomName}`);
  }

  // Emit error notification
  emitCourseError(courseId: string, error: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('course:generation', {
      courseId,
      status: 'failed',
      currentStage: 'completed',
      progress: 0,
      message: 'Generation failed',
      errorMessage: error,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted course:generation (error) to ${roomName}: ${error}`);
  }

  // Helper to determine current stage based on progress
  private determineStage(progress: number): string {
    if (progress < 40) return 'creating';
    if (progress < 70) return 'reviewing';
    if (progress < 90) return 'refining';
    return 'completed';
  }

  // Emit module regeneration progress
  emitModuleProgress(courseId: string, moduleId: string, progress: number, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('module:generation', {
      courseId,
      moduleId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted module:generation to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit module regeneration completion
  emitModuleComplete(courseId: string, moduleId: string, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('module:generation', {
      courseId,
      moduleId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted module:generation (complete) to ${roomName}`);
  }

  // Emit quiz regeneration progress
  emitQuizProgress(courseId: string, progress: number, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('quiz:generation', {
      courseId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted quiz:generation to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit quiz regeneration completion
  emitQuizComplete(courseId: string, message: string) {
    const roomName = `course:${courseId}`;
    this.server.to(roomName).emit('quiz:generation', {
      courseId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted quiz:generation (complete) to ${roomName}`);
  }
}
