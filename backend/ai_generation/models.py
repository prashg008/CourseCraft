import uuid
from django.db import models
from courses.models import Course


class LLMConfig(models.Model):
    """Configuration for LLM providers (OpenAI, Anthropic, etc.)"""

    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic Claude'),
        ('google', 'Google (Gemini)'),
        ('other', 'Other'),
    ]

    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    model_name = models.CharField(max_length=100, help_text="e.g., gpt-4, claude-3-opus")
    api_key = models.CharField(max_length=500, help_text="Store encrypted in production")
    is_active = models.BooleanField(default=False, help_text="Only one config can be active at a time")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "LLM Configuration"
        verbose_name_plural = "LLM Configurations"

    def __str__(self):
        active = " (Active)" if self.is_active else ""
        return f"{self.get_provider_display()} - {self.model_name}{active}"

    def save(self, *args, **kwargs):
        # Ensure only one config is active
        if self.is_active:
            LLMConfig.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class GenerationTask(models.Model):
    """Task tracking for AI-powered content generation"""

    ENTITY_TYPE_CHOICES = [
        ('course', 'Course'),
        ('module', 'Module'),
        ('quiz', 'Quiz'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    STAGE_CHOICES = [
        ('creating', 'Creating'),
        ('reviewing', 'Reviewing'),
        ('refining', 'Refining'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='generation_tasks',
        null=True,
        blank=True
    )
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=100, null=True, blank=True, help_text="ID of the entity being generated")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    current_stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='creating')
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    message = models.TextField(blank=True, help_text="Current status message")
    error_message = models.TextField(blank=True, null=True)
    task_id = models.CharField(max_length=100, blank=True, help_text="Celery task ID")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['course']),
        ]

    def __str__(self):
        return f"{self.get_entity_type_display()} Generation - {self.get_status_display()}"
