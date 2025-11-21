import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';

export enum EntityType {
  COURSE = 'course',
  MODULE = 'module',
  QUIZ = 'quiz',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CurrentStage {
  CREATING = 'creating',
  REVIEWING = 'reviewing',
  REFINING = 'refining',
  COMPLETED = 'completed',
}

@Entity('generation_tasks')
export class GenerationTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EntityType,
    name: 'entity_type',
  })
  entityType: EntityType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: CurrentStage,
    default: CurrentStage.CREATING,
    name: 'current_stage',
  })
  currentStage: CurrentStage;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'task_id', type: 'varchar', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'course_id' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
