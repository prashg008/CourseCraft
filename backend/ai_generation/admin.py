from django.contrib import admin
from .models import LLMConfig, GenerationTask


@admin.register(LLMConfig)
class LLMConfigAdmin(admin.ModelAdmin):
    list_display = ('provider', 'model_name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('provider', 'is_active', 'created_at')
    search_fields = ('provider', 'model_name')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Configuration', {
            'fields': ('provider', 'model_name', 'api_key', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """
        Ensure only one LLM config is active at a time.
        """
        if obj.is_active:
            # Deactivate all other configs
            LLMConfig.objects.filter(is_active=True).exclude(pk=obj.pk).update(is_active=False)
        super().save_model(request, obj, form, change)


@admin.register(GenerationTask)
class GenerationTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'entity_type', 'course', 'status', 'current_stage', 'progress', 'created_at', 'updated_at')
    list_filter = ('status', 'current_stage', 'entity_type', 'created_at')
    search_fields = ('id', 'entity_id', 'course__title', 'message', 'error_message')
    readonly_fields = ('id', 'created_at', 'updated_at')

    fieldsets = (
        ('Task Information', {
            'fields': ('id', 'entity_type', 'entity_id', 'course', 'task_id')
        }),
        ('Status', {
            'fields': ('status', 'current_stage', 'progress', 'message')
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        """
        Generation tasks should be created programmatically, not manually.
        """
        return False
