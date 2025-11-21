import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { Module } from './entities/module.entity';
import { Lesson } from './entities/lesson.entity';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { AiGenerationService } from '../ai-generation/ai-generation.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    @Inject(forwardRef(() => AiGenerationService))
    private readonly aiGenerationService: AiGenerationService,
  ) {}

  async create(userId: string, createCourseDto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({
      ...createCourseDto,
      ownerId: userId,
      status: CourseStatus.GENERATING,
    });

    const savedCourse = await this.courseRepository.save(course);

    // Start AI generation asynchronously (non-blocking)
    try {
      this.aiGenerationService.generateCourseAsync(
        savedCourse.id,
        savedCourse.title,
        savedCourse.description,
        userId,
      );
    } catch (err) {
      // Handle or log the error so it doesn't crash the process
      console.error('AI generation failed for course', savedCourse.id, err);
    }

    return savedCourse;
  }

  async findAll(userId: string, query: QueryCourseDto) {
    const { search, status, sortBy = 'createdAt', order = 'DESC', page = 1, limit = 10 } = query;

    // Base query to compute total count (without joins)
    const baseQb = this.courseRepository
      .createQueryBuilder('course')
      .where('course.ownerId = :userId', { userId });

    if (search) {
      baseQb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status) {
      baseQb.andWhere('course.status = :status', { status });
    }

    const total = await baseQb.getCount();

    // Query that fetches entities along with aggregated counts
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .where('course.ownerId = :userId', { userId })
      .leftJoin('course.modules', 'module')
      .leftJoin('course.quiz', 'quiz')
      .leftJoin('quiz.questions', 'question');

    if (search) {
      qb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status) {
      qb.andWhere('course.status = :status', { status });
    }

    qb.select('course')
      .addSelect('COUNT(DISTINCT module.id)', 'module_count')
      .addSelect('COUNT(DISTINCT question.id)', 'quiz_question_count')
      .groupBy('course.id')
      .orderBy(`course.${sortBy}`, order);

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const { entities: courses, raw } = await qb.getRawAndEntities();

    // Merge aggregate counts from raw results into returned course objects
    const data = courses.map((course, idx) => {
      const row = raw[idx] || {};
      const module_count = Number(row.module_count) || 0;
      const quiz_question_count = Number(row.quiz_question_count) || 0;

      return Object.assign({}, course, {
        moduleCount: module_count,
        quizQuestionCount: quiz_question_count,
      });
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
      relations: ['modules', 'modules.lessons', 'quiz', 'quiz.questions', 'quiz.questions.answers'],
      order: {
        modules: { order: 'ASC', lessons: { order: 'ASC' } },
        quiz: { questions: { order: 'ASC', answers: { order: 'ASC' } } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(
    courseId: string,
    userId: string,
    updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(courseId: string, userId: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.courseRepository.remove(course);
  }

  async publish(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status === CourseStatus.GENERATING) {
      throw new BadRequestException('Cannot publish a course that is still generating');
    }

    course.status = CourseStatus.PUBLISHED;
    return this.courseRepository.save(course);
  }

  async unpublish(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    course.status = CourseStatus.DRAFT;
    return this.courseRepository.save(course);
  }

  async regenerateCourse(courseId: string, userId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
      relations: ['modules', 'modules.lessons', 'quiz', 'quiz.questions', 'quiz.questions.answers'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.courseRepository.update(course.id, { status: CourseStatus.GENERATING });

    // Start course regeneration asynchronously (non-blocking)
    this.aiGenerationService.generateCourseAsync(
      course.id,
      course.title,
      course.description,
      userId,
    );

    return {
      message: 'Course regeneration started',
      status: 'generating',
      courseId: course.id,
    };
  }

  async regenerateModule(courseId: string, moduleId: string, userId: string, feedback?: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const module = await this.moduleRepository.findOne({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Start module regeneration asynchronously (non-blocking)
    this.aiGenerationService.regenerateModuleAsync(courseId, moduleId, userId, feedback);

    return {
      message: 'Module regeneration started',
      status: 'generating',
      feedback,
    };
  }

  async regenerateQuiz(courseId: string, userId: string, feedback?: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Start quiz regeneration asynchronously (non-blocking)
    const result = this.aiGenerationService.regenerateQuizAsync(courseId, userId, feedback);

    return {
      message: 'Quiz regeneration started',
      status: result.status,
      feedback,
    };
  }

  async createQuestion(
    courseId: string,
    userId: string,
    createQuestionDto: CreateQuestionDto,
  ): Promise<Question> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
      relations: ['quiz'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.quiz) {
      throw new NotFoundException('Quiz not found for this course');
    }

    const question = this.buildQuestionEntity(course.quiz.id, createQuestionDto);
    return this.questionRepository.save(question);
  }

  async createQuestionByQuiz(
    quizId: string,
    userId: string,
    createQuestionDto: CreateQuestionDto,
  ): Promise<Question> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['course'],
    });

    if (!quiz || quiz.course.ownerId !== userId) {
      throw new NotFoundException('Quiz not found');
    }

    const question = this.buildQuestionEntity(quiz.id, createQuestionDto);
    return this.questionRepository.save(question);
  }

  async findAllQuestions(courseId: string, userId: string): Promise<Question[]> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.answers'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.quiz) {
      throw new NotFoundException('Quiz not found for this course');
    }

    return course.quiz.questions;
  }

  async findQuestions(userId: string, query: QueryQuestionDto = {}): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('question')
      .innerJoin('question.quiz', 'quiz')
      .innerJoin('quiz.course', 'course')
      .leftJoinAndSelect('question.answers', 'answers')
      .where('course.ownerId = :userId', { userId })
      .orderBy('question.order', 'ASC')
      .addOrderBy('answers.order', 'ASC');

    if (query.courseId) {
      qb.andWhere('course.id = :courseId', { courseId: query.courseId });
    }

    return qb.getMany();
  }

  async findQuestion(questionId: string, userId: string): Promise<Question> {
    return this.ensureQuestionOwnership(questionId, userId, { loadAnswers: true });
  }

  async updateQuestion(
    questionId: string,
    userId: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<Question> {
    const question = await this.ensureQuestionOwnership(questionId, userId, { loadAnswers: true });

    if (updateQuestionDto.answers) {
      await this.answerRepository.remove(question.answers);
      question.answers = updateQuestionDto.answers.map((answer) =>
        this.answerRepository.create(answer),
      );
    }

    Object.assign(question, updateQuestionDto);
    return this.questionRepository.save(question);
  }

  async removeQuestion(questionId: string, userId: string): Promise<void> {
    const question = await this.ensureQuestionOwnership(questionId, userId);
    await this.questionRepository.remove(question);
  }

  private async ensureQuestionOwnership(
    questionId: string,
    userId: string,
    options: { loadAnswers?: boolean } = {},
  ): Promise<Question> {
    const relations = ['quiz', 'quiz.course'];
    if (options.loadAnswers) {
      relations.push('answers');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations,
    });

    if (!question || question.quiz.course.ownerId !== userId) {
      throw new NotFoundException('Question not found');
    }

    if (options.loadAnswers && question.answers) {
      question.answers = [...question.answers].sort((a, b) => a.order - b.order);
    }

    return question;
  }

  private buildQuestionEntity(quizId: string, createQuestionDto: CreateQuestionDto): Question {
    return this.questionRepository.create({
      ...createQuestionDto,
      quizId,
      answers: createQuestionDto.answers.map((answer) => this.answerRepository.create(answer)),
    });
  }

  async archive(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    course.status = CourseStatus.ARCHIVED;
    return this.courseRepository.save(course);
  }

  async unarchive(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, ownerId: userId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    course.status = CourseStatus.DRAFT;
    return this.courseRepository.save(course);
  }
}
