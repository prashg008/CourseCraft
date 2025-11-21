import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GenerationSnapshotService } from './snapshot.service';
import type {
  EventEnvelope,
  CourseGenerationPayload,
  ModuleGenerationPayload,
  QuizGenerationPayload,
  ErrorPayload,
} from './contracts/events';

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
export class CourseGenerationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CourseGenerationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly snapshotService: GenerationSnapshotService,
    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    // The connection-level JWT verification is handled in the server middleware
    // registered in `afterInit`. Here we simply verify middleware attached `userId`.
    if (!client.userId) {
      this.logger.warn(`Unauthenticated client attempted to connect: ${client.id}`);
      try {
        client.disconnect(true);
      } catch {
        // ignore
      }
      return;
    }

    this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);
  }

  afterInit(server: Server) {
    // Attach a Socket.IO middleware to validate JWT on handshake and attach userId
    // to the socket. This prevents unauthenticated sockets from establishing.
    server.use((socket: Socket & { userId?: string }, next: (err?: Error) => void) => {
      const token: string =
        typeof socket.handshake?.auth?.token === 'string'
          ? socket.handshake.auth.token
          : typeof socket.handshake?.headers?.authorization === 'string'
            ? String(socket.handshake.headers.authorization).replace('Bearer··', '')
            : typeof socket.handshake?.query?.token === 'string'
              ? String(socket.handshake.query.token)
              : '';

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      // verify token (use promise chain so middleware is not async)
      this.jwtService
        .verifyAsync(token, { secret: this.configService.get<string>('jwt.secret') })
        .then((payload: unknown) => {
          // attach to socket for later handlers
          const maybe = payload as Record<string, unknown>;
          const subVal = maybe && typeof maybe.sub === 'string' ? maybe.sub : null;
          socket.userId = subVal ?? undefined;
          if (!socket.userId) return next(new Error('Unauthorized'));
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
  }

  @SubscribeMessage('joinCourse')
  async handleJoinCourse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    const { courseId } = data;
    const roomName = `course:${courseId}`;

    await client.join(roomName);
    this.logger.log(`Client ${client.id} joined room: ${roomName}`);

    return { success: true, message: `Joined course ${courseId}` };
  }

  @SubscribeMessage('leaveCourse')
  async handleLeaveCourse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    const { courseId } = data;
    const roomName = `course:${courseId}`;

    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left room: ${roomName}`);

    return { success: true, message: `Left course ${courseId}` };
  }

  // Handle subscribe messages from frontend (maps to joinCourse)
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { event: string; id?: string },
  ) {
    const { event, id } = data;

    if (!id) {
      return { success: false, message: 'ID is required for subscription' };
    }

    // Compose composite room/event name: e.g. 'course:generation:{id}'
    const roomName = `${event}:${id}`;

    // Basic validation for allowed event prefixes
    if (!/^course:|^module:|^quiz:/.test(event)) {
      return { success: false, message: `Unknown event type: ${event}` };
    }

    // Ensure authenticated user
    const userId = client.userId;
    if (!userId) {
      this.logger.warn(`Unauthenticated socket attempted to subscribe: ${client.id}`);
      return { success: false, message: 'Unauthorized' };
    }

    // Authorization checks per entity
    const entity = event.split(':')[0];
    let allowed = false;
    try {
      if (entity === 'course') {
        allowed = await this.coursesService.canAccessCourse(id, userId);
      } else if (entity === 'module') {
        allowed = await this.coursesService.canAccessModule(id, userId);
      } else if (entity === 'quiz') {
        allowed = await this.coursesService.canAccessQuiz(id, userId);
      }
    } catch {
      this.logger.warn(`Authorization check failed for ${entity}:${id} user=${userId}`);
      allowed = false;
    }

    if (!allowed) {
      this.logger.warn(`User ${userId} is not authorized for ${entity}:${id}`);
      return { success: false, message: 'Unauthorized' };
    }

    await client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to ${event} (room: ${roomName})`);

    return { success: true, message: `Subscribed to ${event}` };
  }

  // Handle unsubscribe messages from frontend
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { event: string; id?: string },
  ) {
    const { event, id } = data;

    if (!id) {
      return { success: false, message: 'ID is required for unsubscription' };
    }
    const roomName = `${event}:${id}`;

    if (!/^course:|^module:|^quiz:/.test(event)) {
      return { success: false, message: `Unknown event type: ${event}` };
    }

    await client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from ${event} (room: ${roomName})`);

    return { success: true, message: `Unsubscribed from ${event}` };
  }

  // Emit progress updates to a specific course room
  emitCourseProgress(courseId: string, progress: number, message: string) {
    const roomName = `course:generation:${courseId}`;
    const eventName = roomName; // composite event key
    const payload: CourseGenerationPayload = {
      courseId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
    };

    const envelope: EventEnvelope<CourseGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    // persist latest snapshot for late-joiners
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit completion notification
  emitCourseComplete(courseId: string, message: string) {
    const roomName = `course:generation:${courseId}`;
    const eventName = roomName;
    const payload: CourseGenerationPayload = {
      courseId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
    };
    const envelope: EventEnvelope<CourseGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} (complete) to ${roomName}`);
  }

  // Emit error notification
  emitCourseError(courseId: string, error: string) {
    const roomName = `course:generation:${courseId}`;
    const eventName = roomName;
    const payload: ErrorPayload = {
      courseId,
      message: error,
    };

    const envelope: EventEnvelope<ErrorPayload> = {
      version: 'v1',
      event: `${eventName}.error`,
      timestamp: new Date().toISOString(),
      payload,
    };
    // persist latest error in snapshot
    this.snapshotService.set(roomName, envelope.payload);

    // Emit error on the composite event name (with .error suffix)
    this.server.to(roomName).emit(eventName + '.error', envelope);
    this.logger.log(`Emitted ${eventName}.error to ${roomName}: ${error}`);
  }

  // Helper to determine current stage based on progress
  private determineStage(progress: number): 'creating' | 'reviewing' | 'refining' | 'completed' {
    if (progress < 40) return 'creating';
    if (progress < 70) return 'reviewing';
    if (progress < 90) return 'refining';
    return 'completed';
  }

  // Emit module regeneration progress
  emitModuleProgress(courseId: string, moduleId: string, progress: number, message: string) {
    const roomName = `module:generation:${moduleId}`;
    const eventName = roomName;
    const payload: ModuleGenerationPayload = {
      courseId,
      moduleId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
    };

    const envelope: EventEnvelope<ModuleGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit module regeneration completion
  emitModuleComplete(courseId: string, moduleId: string, message: string) {
    const roomName = `module:generation:${moduleId}`;
    const eventName = roomName;
    const payload: ModuleGenerationPayload = {
      courseId,
      moduleId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
    };

    const envelope: EventEnvelope<ModuleGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} (complete) to ${roomName}`);
  }

  // Emit module regeneration error
  emitModuleError(courseId: string, moduleId: string, error: string) {
    const roomName = `module:generation:${moduleId}`;
    const eventName = roomName;
    const payload: ErrorPayload = {
      courseId,
      moduleId,
      message: error,
    };

    const envelope: EventEnvelope<ErrorPayload> = {
      version: 'v1',
      event: `${eventName}.error`,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName + '.error', envelope);
    this.logger.log(`Emitted ${eventName}.error to ${roomName}: ${error}`);
  }

  // Emit quiz regeneration progress
  emitQuizProgress(courseId: string, progress: number, message: string, quizId?: string) {
    const id = quizId ?? courseId;
    const roomName = `quiz:generation:${id}`;
    const eventName = roomName;
    const payload: QuizGenerationPayload = {
      courseId,
      quizId: quizId,
      status: progress >= 100 ? 'completed' : 'generating',
      currentStage: this.determineStage(progress),
      progress,
      message,
    };

    const envelope: EventEnvelope<QuizGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} to ${roomName}: ${progress}% - ${message}`);
  }

  // Emit quiz regeneration completion
  emitQuizComplete(courseId: string, message: string, quizId?: string) {
    const id = quizId ?? courseId;
    const roomName = `quiz:generation:${id}`;
    const eventName = roomName;
    const payload: QuizGenerationPayload = {
      courseId,
      quizId: quizId,
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      message,
    };

    const envelope: EventEnvelope<QuizGenerationPayload> = {
      version: 'v1',
      event: eventName,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName, envelope);
    this.logger.log(`Emitted ${eventName} (complete) to ${roomName}`);
  }

  // Emit quiz regeneration error
  emitQuizError(courseId: string, error: string, quizId?: string) {
    const id = quizId ?? courseId;
    const roomName = `quiz:generation:${id}`;
    const eventName = roomName;
    const payload: ErrorPayload = {
      courseId,
      quizId: quizId,
      message: error,
    };

    const envelope: EventEnvelope<ErrorPayload> = {
      version: 'v1',
      event: `${eventName}.error`,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.snapshotService.set(roomName, envelope.payload);

    this.server.to(roomName).emit(eventName + '.error', envelope);
    this.logger.log(`Emitted ${eventName}.error to ${roomName}: ${error}`);
  }
}
