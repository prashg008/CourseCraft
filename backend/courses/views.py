from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count
from .models import Course, Module, Lesson, Quiz, Question, Answer
from .serializers import (
    CourseSerializer,
    CourseListSerializer,
    CourseCreateSerializer,
    ModuleSerializer,
    ModuleCreateSerializer,
    LessonSerializer,
    QuizSerializer,
    QuestionSerializer,
    QuestionCreateSerializer,
    AnswerSerializer,
)
from ai_generation.models import GenerationTask
from ai_generation.tasks import generate_module_lessons, generate_quiz_questions_task
from ai_generation.serializers import GenerationTaskSerializer


class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course CRUD operations
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return CourseCreateSerializer
        return CourseSerializer

    def get_queryset(self):
        """Filter courses by owner"""
        return (
            Course.objects.filter(owner=self.request.user)
            .select_related("quiz")
            .prefetch_related("modules__lessons", "quiz__questions__answers")
            .annotate(
                module_count=Count("modules", distinct=True),
                quiz_question_count=Count("quiz__questions", distinct=True),
            )
        )

    def perform_create(self, serializer):
        """Set the owner to the current user"""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish a course"""
        course = self.get_object()
        course.status = "published"
        course.save()
        serializer = self.get_serializer(course)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive a course"""
        course = self.get_object()
        course.status = "archived"
        course.save()
        serializer = self.get_serializer(course)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        """Unarchive a course (set to draft)"""
        course = self.get_object()
        course.status = "draft"
        course.save()
        serializer = self.get_serializer(course)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def archived(self, request):
        """Get all archived courses"""
        archived_courses = self.get_queryset().filter(status="archived")
        serializer = self.get_serializer(archived_courses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="modules/(?P<module_id>[^/.]+)/regenerate")
    def regenerate_module(self, request, pk=None, module_id=None):
        """Regenerate lessons for a specific module"""
        course = self.get_object()

        # Get the module and verify it belongs to this course
        module = get_object_or_404(Module, id=module_id, course=course)

        # Check if there's already a running task for this module
        existing_task = GenerationTask.objects.filter(
            entity_type='module',
            entity_id=str(module_id),
            status__in=['pending', 'running']
        ).first()

        if existing_task:
            return Response(
                {
                    'error': 'A generation task is already running for this module',
                    'task_id': str(existing_task.id)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Note: Lessons will be deleted by the Celery task AFTER successful generation
        # This prevents data loss if generation fails

        # Create generation task
        task = GenerationTask.objects.create(
            entity_type='module',
            entity_id=str(module_id),
            course=course,
            status='pending',
            current_stage='creating',
            progress=0,
            message='Task created, waiting to start...'
        )

        # Update module status
        module.generation_status = 'generating'
        module.save()

        # Start the Celery task
        generate_module_lessons.delay(str(task.id), str(module_id))

        serializer = GenerationTaskSerializer(task)
        return Response({
            'success': True,
            'message': 'Module regeneration started',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="quiz/regenerate")
    def regenerate_quiz(self, request, pk=None):
        """Regenerate quiz for a course"""
        course = self.get_object()

        # Get or create quiz for this course
        quiz = Quiz.objects.filter(course=course).first()
        if not quiz:
            return Response(
                {'error': 'No quiz found for this course'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if there's already a running task for this quiz
        existing_task = GenerationTask.objects.filter(
            entity_type='quiz',
            entity_id=str(quiz.id),
            status__in=['pending', 'running']
        ).first()

        if existing_task:
            return Response(
                {
                    'error': 'A generation task is already running for this quiz',
                    'task_id': str(existing_task.id)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Note: Questions will be deleted by the Celery task AFTER successful generation
        # This prevents data loss if generation fails

        # Create generation task
        task = GenerationTask.objects.create(
            entity_type='quiz',
            entity_id=str(quiz.id),
            course=course,
            status='pending',
            current_stage='creating',
            progress=0,
            message='Task created, waiting to start...'
        )

        # Update quiz status
        quiz.generation_status = 'generating'
        quiz.save()

        # Start the Celery task
        generate_quiz_questions_task.delay(str(task.id), str(quiz.id))

        serializer = GenerationTaskSerializer(task)
        return Response({
            'success': True,
            'message': 'Quiz regeneration started',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class ModuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Module CRUD operations
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ModuleCreateSerializer
        return ModuleSerializer

    def get_queryset(self):
        """Filter modules by course owner"""
        course_id = self.request.query_params.get("course_id")
        queryset = Module.objects.filter(course__owner=self.request.user).prefetch_related("lessons")

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset

    def perform_create(self, serializer):
        """Ensure the user owns the course"""
        course = serializer.validated_data["course"]
        if course.owner != self.request.user:
            return Response(
                {"error": "You do not have permission to add modules to this course"}, status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()


class LessonViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Lesson CRUD operations
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LessonSerializer

    def get_queryset(self):
        """Filter lessons by module's course owner"""
        module_id = self.request.query_params.get("module_id")
        queryset = Lesson.objects.filter(module__course__owner=self.request.user)

        if module_id:
            queryset = queryset.filter(module_id=module_id)

        return queryset

    def perform_create(self, serializer):
        """Ensure the user owns the course"""
        module = serializer.validated_data["module"]
        if module.course.owner != self.request.user:
            return Response(
                {"error": "You do not have permission to add lessons to this module"}, status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()


class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Quiz CRUD operations
    """

    permission_classes = [IsAuthenticated]
    serializer_class = QuizSerializer

    def get_queryset(self):
        """Filter quizzes by course owner"""
        course_id = self.request.query_params.get("course_id")
        queryset = Quiz.objects.filter(course__owner=self.request.user).prefetch_related("questions__answers")

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset


class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Question CRUD operations
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return QuestionCreateSerializer
        return QuestionSerializer

    def get_queryset(self):
        """Filter questions by quiz's course owner"""
        quiz_id = self.request.query_params.get("quiz_id")
        queryset = Question.objects.filter(quiz__course__owner=self.request.user).prefetch_related("answers")

        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)

        return queryset

    def perform_create(self, serializer):
        """Ensure the user owns the course"""
        quiz = serializer.validated_data["quiz"]
        if quiz.course.owner != self.request.user:
            return Response(
                {"error": "You do not have permission to add questions to this quiz"}, status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()


class AnswerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Answer CRUD operations
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AnswerSerializer

    def get_queryset(self):
        """Filter answers by question's quiz's course owner"""
        question_id = self.request.query_params.get("question_id")
        queryset = Answer.objects.filter(question__quiz__course__owner=self.request.user)

        if question_id:
            queryset = queryset.filter(question_id=question_id)

        return queryset

    def perform_create(self, serializer):
        """Ensure the user owns the course"""
        question = serializer.validated_data["question"]
        if question.quiz.course.owner != self.request.user:
            return Response(
                {"error": "You do not have permission to add answers to this question"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer.save()
