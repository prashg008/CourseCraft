import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const courseId = request.params.id || request.params.courseId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!courseId) {
      throw new ForbiddenException('Course ID not provided');
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'ownerId'],
    });

    if (!course) {
      throw new ForbiddenException('Course not found');
    }

    if (course.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this course');
    }

    return true;
  }
}
