from django.db.models.signals import post_save
from django.dispatch import receiver

from ai_generation.models import GenerationTask
from ai_generation.tasks import generate_course_content
from .models import Course


@receiver(post_save, sender=Course)
def trigger_course_generation(sender, instance: Course, created, **kwargs):
    """Start AI generation once a fresh course is created."""
    if not created:
        return

    # Update the course status to show generation is in progress
    instance.status = "generating"
    instance.save(update_fields=["status"])

    # Create a tracking task for this course generation
    generation_task = GenerationTask.objects.create(
        course=instance,
        entity_type="course",
        entity_id=str(instance.id),
        status="pending",
        message="Queued for AI generation",
    )

    # Kick off the Celery task asynchronously
    generate_course_content.delay(str(generation_task.id))
