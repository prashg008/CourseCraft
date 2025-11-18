from rest_framework import serializers
from .models import LLMConfig, GenerationTask


class LLMConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LLMConfig
        fields = ['id', 'provider', 'model_name', 'api_key', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True}  # Don't expose API key in responses
        }

    def validate(self, data):
        """
        Ensure only one config is active at a time
        """
        if data.get('is_active'):
            # Check if another config is already active
            active_config = LLMConfig.objects.filter(is_active=True).exclude(
                pk=self.instance.pk if self.instance else None
            ).first()

            if active_config:
                # Deactivate the other config
                active_config.is_active = False
                active_config.save()

        return data


class LLMConfigListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing configs without exposing API key"""
    class Meta:
        model = LLMConfig
        fields = ['id', 'provider', 'model_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GenerationTaskSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = GenerationTask
        fields = [
            'id', 'entity_type', 'entity_id', 'course', 'course_title',
            'status', 'current_stage', 'progress', 'message', 'error_message',
            'task_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GenerationTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenerationTask
        fields = ['entity_type', 'entity_id', 'course']

    def create(self, validated_data):
        # Default values
        validated_data['status'] = 'pending'
        validated_data['current_stage'] = 'creating'
        validated_data['progress'] = 0
        validated_data['message'] = 'Task created, waiting to start...'

        return GenerationTask.objects.create(**validated_data)


class GenerationTaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating task progress and status"""
    class Meta:
        model = GenerationTask
        fields = ['status', 'current_stage', 'progress', 'message', 'error_message']
