from django.contrib import admin
from .models import Course, Module, Lesson, Quiz, Question, Answer


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0
    fields = ('title', 'order', 'generation_status')
    ordering = ('order',)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ('title', 'order')
    ordering = ('order',)


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ('text', 'type', 'order')
    ordering = ('order',)


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    fields = ('text', 'is_correct', 'order')
    ordering = ('order',)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'owner')
    search_fields = ('title', 'description', 'owner__username')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [ModuleInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'description', 'owner')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'generation_status', 'created_at')
    list_filter = ('generation_status', 'created_at', 'course')
    search_fields = ('title', 'description', 'course__title')
    readonly_fields = ('id', 'created_at')
    inlines = [LessonInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'course', 'title', 'description', 'order')
        }),
        ('Generation Status', {
            'fields': ('generation_status',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order', 'created_at')
    list_filter = ('created_at', 'module__course')
    search_fields = ('title', 'content', 'module__title')
    readonly_fields = ('id', 'created_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'module', 'title', 'order')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('course', 'generation_status', 'created_at')
    list_filter = ('generation_status', 'created_at')
    search_fields = ('course__title',)
    readonly_fields = ('id', 'created_at')
    inlines = [QuestionInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'course')
        }),
        ('Generation Status', {
            'fields': ('generation_status',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz', 'type', 'order', 'created_at')
    list_filter = ('type', 'created_at', 'quiz__course')
    search_fields = ('text', 'quiz__course__title')
    readonly_fields = ('id', 'created_at')
    inlines = [AnswerInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'quiz', 'text', 'type', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'is_correct', 'order')
    list_filter = ('is_correct', 'question__quiz__course')
    search_fields = ('text', 'question__text')
    readonly_fields = ('id',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'question', 'text', 'is_correct', 'order')
        }),
    )
