from rest_framework import serializers
from .models import Course, Module, Lesson, Quiz, Question, Answer


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct', 'order']
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'order', 'answers', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionCreateSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'order', 'answers']
        read_only_fields = ['id']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers')
        question = Question.objects.create(**validated_data)

        for answer_data in answers_data:
            Answer.objects.create(question=question, **answer_data)

        return question

    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)

        # Update question fields
        instance.text = validated_data.get('text', instance.text)
        instance.type = validated_data.get('type', instance.type)
        instance.order = validated_data.get('order', instance.order)
        instance.save()

        # Update answers if provided
        if answers_data is not None:
            # Delete existing answers and create new ones
            instance.answers.all().delete()
            for answer_data in answers_data:
                Answer.objects.create(question=instance, **answer_data)

        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'course', 'generation_status', 'questions', 'created_at']
        read_only_fields = ['id', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'content', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'generation_status', 'lessons', 'created_at']
        read_only_fields = ['id', 'created_at']


class ModuleCreateSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, required=False)

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'generation_status', 'lessons']
        read_only_fields = ['id']

    def create(self, validated_data):
        lessons_data = validated_data.pop('lessons', [])
        module = Module.objects.create(**validated_data)

        for lesson_data in lessons_data:
            Lesson.objects.create(module=module, **lesson_data)

        return module

    def update(self, instance, validated_data):
        lessons_data = validated_data.pop('lessons', None)

        # Update module fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.order = validated_data.get('order', instance.order)
        instance.generation_status = validated_data.get('generation_status', instance.generation_status)
        instance.save()

        # Update lessons if provided
        if lessons_data is not None:
            # Delete existing lessons and create new ones
            instance.lessons.all().delete()
            for lesson_data in lessons_data:
                Lesson.objects.create(module=instance, **lesson_data)

        return instance


class CourseSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    quiz = QuizSerializer(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'status', 'owner', 'owner_username',
            'modules', 'quiz', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for course listings without nested data"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    module_count = serializers.SerializerMethodField()
    quiz_question_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'status', 'owner', 'owner_username',
            'module_count', 'quiz_question_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_module_count(self, obj):
        annotated_value = getattr(obj, 'module_count', None)
        if annotated_value is not None:
            return annotated_value
        return obj.modules.count()

    def get_quiz_question_count(self, obj):
        annotated_value = getattr(obj, 'quiz_question_count', None)
        if annotated_value is not None:
            return annotated_value
        quiz = getattr(obj, 'quiz', None)
        if not quiz:
            return 0
        return quiz.questions.count()


class CourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'status']
        read_only_fields = ['id']
