import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Module } from './module.entity';
import { Quiz } from './quiz.entity';
import { GenerationTask } from '../../generation-tasks/entities/generation-task.entity';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  GENERATING = 'generating',
  ARCHIVED = 'archived',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Module, (module) => module.course, { cascade: true })
  modules: Module[];

  @OneToOne(() => Quiz, (quiz) => quiz.course, { cascade: true })
  quiz: Quiz;

  @OneToMany(() => GenerationTask, (task) => task.course, { cascade: true })
  generationTasks: GenerationTask[];
}
