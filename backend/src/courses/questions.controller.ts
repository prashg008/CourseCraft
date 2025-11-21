import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateQuestionWithCourseDto } from './dto/create-question-with-course.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuestionsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question for a course quiz' })
  @ApiResponse({ status: 201, description: 'Question created' })
  @ApiResponse({ status: 404, description: 'Course or quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: UserPayload,
    @Body() createQuestionDto: CreateQuestionWithCourseDto,
  ) {
    const { courseId, quizId, ...questionPayload } = createQuestionDto;

    if (typeof quizId === 'string') {
      return this.coursesService.createQuestionByQuiz(quizId, user.id, questionPayload);
    }

    if (typeof courseId === 'string') {
      return this.coursesService.createQuestion(courseId, user.id, questionPayload);
    }

    throw new BadRequestException('Either courseId or quizId must be provided');
  }

  @Get()
  @ApiOperation({ summary: 'List questions owned by the current user' })
  @ApiResponse({ status: 200, description: 'Questions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: UserPayload, @Query() query: QueryQuestionDto) {
    return this.coursesService.findQuestions(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single question' })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@CurrentUser() user: UserPayload, @Param('id') questionId: string) {
    return this.coursesService.findQuestion(questionId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateQuestion(
    @CurrentUser() user: UserPayload,
    @Param('id') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.coursesService.updateQuestion(questionId, user.id, updateQuestionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 204, description: 'Question deleted' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeQuestion(@CurrentUser() user: UserPayload, @Param('id') questionId: string) {
    await this.coursesService.removeQuestion(questionId, user.id);
  }
}
