from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GenerationTaskViewSet,
    generate_course,
    generate_module,
    get_task_status
)

router = DefaultRouter()
router.register(r'tasks', GenerationTaskViewSet, basename='generation-task')

urlpatterns = [
    path('', include(router.urls)),
    path('generate/course/<uuid:course_id>/', generate_course, name='generate-course'),
    path('generate/module/<uuid:module_id>/', generate_module, name='generate-module'),
    path('tasks/<uuid:task_id>/status/', get_task_status, name='task-status'),
]
