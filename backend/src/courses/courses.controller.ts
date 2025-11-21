import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { RegenerateModuleDto } from './dto/regenerate-module.dto';
import { RegenerateQuizDto } from './dto/regenerate-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('courses')
@Controller('courses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created and AI generation queued' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@CurrentUser() user: UserPayload, @Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(user.id, createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses for current user' })
  @ApiResponse({ status: 200, description: 'List of courses with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: UserPayload, @Query() query: QueryCourseDto) {
    return this.coursesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course details with full content' })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update course title or description' })
  @ApiResponse({ status: 200, description: 'Course updated' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, user.id, updateCourseDto);
  }

  @Patch(':id/details')
  @ApiOperation({ summary: 'Update course details (title and/or description)' })
  @ApiResponse({ status: 200, description: 'Course details updated' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateDetails(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, user.id, updateCourseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 204, description: 'Course deleted' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    await this.coursesService.remove(id, user.id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a course' })
  @ApiResponse({ status: 200, description: 'Course published' })
  @ApiResponse({ status: 400, description: 'Cannot publish generating course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async publish(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a course' })
  @ApiResponse({ status: 200, description: 'Course unpublished' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unpublish(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.unpublish(id, user.id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate entire course content' })
  @ApiResponse({ status: 200, description: 'Course regeneration started' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateCourse(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.regenerateCourse(id, user.id);
  }

  @Post(':id/modules/:moduleId/regenerate')
  @ApiOperation({ summary: 'Regenerate a module' })
  @ApiResponse({ status: 200, description: 'Module regeneration queued' })
  @ApiResponse({ status: 404, description: 'Course or module not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateModule(
    @CurrentUser() user: UserPayload,
    @Param('id') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() regenerateModuleDto: RegenerateModuleDto,
  ) {
    return this.coursesService.regenerateModule(
      courseId,
      moduleId,
      user.id,
      regenerateModuleDto.feedback,
    );
  }

  @Post(':id/quiz/regenerate')
  @ApiOperation({ summary: 'Regenerate quiz' })
  @ApiResponse({ status: 200, description: 'Quiz regeneration queued' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateQuiz(
    @CurrentUser() user: UserPayload,
    @Param('id') courseId: string,
    @Body() regenerateQuizDto: RegenerateQuizDto,
  ) {
    return this.coursesService.regenerateQuiz(courseId, user.id, regenerateQuizDto.feedback);
  }

  @Post(':id/quiz/questions')
  @ApiOperation({ summary: 'Add a new question to quiz' })
  @ApiResponse({ status: 201, description: 'Question created' })
  @ApiResponse({ status: 404, description: 'Course or quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createQuestion(
    @CurrentUser() user: UserPayload,
    @Param('id') courseId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.coursesService.createQuestion(courseId, user.id, createQuestionDto);
  }

  @Get(':id/quiz/questions')
  @ApiOperation({ summary: 'Get all questions for a quiz' })
  @ApiResponse({ status: 200, description: 'List of questions' })
  @ApiResponse({ status: 404, description: 'Course or quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllQuestions(@CurrentUser() user: UserPayload, @Param('id') courseId: string) {
    return this.coursesService.findAllQuestions(courseId, user.id);
  }

  @Patch('questions/:id')
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

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 204, description: 'Question deleted' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeQuestion(@CurrentUser() user: UserPayload, @Param('id') questionId: string) {
    await this.coursesService.removeQuestion(questionId, user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a course' })
  @ApiResponse({ status: 200, description: 'Course archived' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async archive(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.archive(id, user.id);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a course' })
  @ApiResponse({ status: 200, description: 'Course unarchived' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unarchive(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.coursesService.unarchive(id, user.id);
  }
}
