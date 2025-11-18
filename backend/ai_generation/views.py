from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import GenerationTask
from .serializers import (
    GenerationTaskSerializer, GenerationTaskCreateSerializer,
    GenerationTaskUpdateSerializer
)
from .tasks import generate_course_content, generate_module_lessons
from courses.models import Course, Module


class GenerationTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Generation Task management
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return GenerationTaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return GenerationTaskUpdateSerializer
        return GenerationTaskSerializer

    def get_queryset(self):
        """Filter tasks by course owner"""
        return GenerationTask.objects.filter(
            course__owner=self.request.user
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new generation task and start it"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the task
        task = serializer.save()

        # Start the appropriate Celery task based on entity type
        if task.entity_type == 'course':
            # Start course generation
            generate_course_content.delay(str(task.id))
        elif task.entity_type == 'module':
            # Start module generation
            module_id = task.entity_id
            generate_module_lessons.delay(str(task.id), module_id)

        response_serializer = GenerationTaskSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_course(request, course_id):
    """
    Start generating content for a course
    """
    # Get the course and verify ownership
    course = get_object_or_404(Course, id=course_id, owner=request.user)

    # Check if there's already a running task for this course
    existing_task = GenerationTask.objects.filter(
        course=course,
        status__in=['pending', 'running']
    ).first()

    if existing_task:
        return Response(
            {
                'error': 'A generation task is already running for this course',
                'task_id': str(existing_task.id)
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create generation task
    task = GenerationTask.objects.create(
        entity_type='course',
        course=course,
        status='pending',
        current_stage='creating',
        progress=0,
        message='Task created, waiting to start...'
    )

    # Update course status
    course.status = 'generating'
    course.save()

    # Start the Celery task
    generate_course_content.delay(str(task.id))

    serializer = GenerationTaskSerializer(task)
    return Response({
        'success': True,
        'message': 'Course generation started',
        'data': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_module(request, module_id):
    """
    Start generating lessons for a module
    """
    # Get the module and verify ownership
    module = get_object_or_404(
        Module,
        id=module_id,
        course__owner=request.user
    )

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

    # Create generation task
    task = GenerationTask.objects.create(
        entity_type='module',
        entity_id=str(module_id),
        course=module.course,
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
        'message': 'Module generation started',
        'data': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_status(request, task_id):
    """
    Get the status of a generation task
    """
    task = get_object_or_404(
        GenerationTask,
        id=task_id,
        course__owner=request.user
    )

    serializer = GenerationTaskSerializer(task)
    return Response({
        'success': True,
        'data': serializer.data
    })
