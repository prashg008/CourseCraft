from celery import shared_task
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import GenerationTask
from .services import AIGenerationService
from courses.models import Course, Module, Lesson, Quiz, Question, Answer
import time
import traceback


def send_progress_update(task_id: str, data: dict, course_id: str = None, entity_type: str = None, entity_id: str = None):
    """
    Send progress update via WebSocket to both task and course groups

    Args:
        task_id: The generation task ID
        data: Progress data to send
        course_id: Optional course ID (fetched from task if not provided)
        entity_type: Type of entity being generated (course, module, quiz)
        entity_id: ID of the specific entity
    """
    channel_layer = get_channel_layer()

    # If course_id not provided, fetch it from the task
    if not course_id:
        try:
            task = GenerationTask.objects.get(id=task_id)
            course_id = str(task.course_id) if task.course_id else None
            entity_type = task.entity_type
            entity_id = task.entity_id
        except GenerationTask.DoesNotExist:
            pass

    # Add entity information to data
    enhanced_data = {
        **data,
        "task_id": task_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
    }

    # Send to task-specific group (backward compatibility)
    async_to_sync(channel_layer.group_send)(
        f"generation_{task_id}",
        {"type": "generation_update", "data": enhanced_data}
    )

    # Send to course-level group (for multi-entity support)
    if course_id:
        async_to_sync(channel_layer.group_send)(
            f"course_{course_id}",
            {"type": "generation_update", "data": enhanced_data}
        )


@shared_task(bind=True)
def generate_course_content(self, task_id: str):
    """
    Generate complete course content including modules, lessons, and quiz
    """
    try:
        # Get the generation task
        task = GenerationTask.objects.get(id=task_id)
        course = task.course

        # Update task status
        task.status = "running"
        task.task_id = self.request.id
        task.save()

        # Send initial progress
        send_progress_update(
            task_id,
            {"status": "running", "stage": "creating", "progress": 0, "message": "Starting course generation..."},
        )

        # Delete existing course content for regeneration
        # This ensures a clean slate and avoids unique constraint violations
        send_progress_update(
            task_id,
            {"status": "running", "stage": "creating", "progress": 2, "message": "Clearing existing content..."},
        )

        # Delete existing modules (lessons will cascade delete)
        course.modules.all().delete()

        # Delete existing quiz (questions and answers will cascade delete)
        if hasattr(course, 'quiz'):
            course.quiz.delete()

        # Initialize AI service
        ai_service = AIGenerationService()

        # Stage 1: Generate course outline (0-20%)
        task.current_stage = "creating"
        task.progress = 5
        task.message = "Generating course outline..."
        task.save()
        send_progress_update(
            task_id,
            {"status": "running", "stage": "creating", "progress": 5, "message": "Generating course outline..."},
        )

        modules_data = ai_service.generate_course_outline(
            title=course.title, description=course.description, num_modules=5
        )

        task.progress = 20
        task.message = f"Generated {len(modules_data)} modules"
        task.save()
        send_progress_update(
            task_id,
            {
                "status": "running",
                "stage": "creating",
                "progress": 20,
                "message": f"Generated {len(modules_data)} modules",
            },
        )

        # Stage 2: Generate module content (20-70%)
        task.message = "Generating lessons for each module..."
        task.save()

        total_modules = len(modules_data)
        progress_per_module = 50 / total_modules

        for idx, module_data in enumerate(modules_data, 1):
            # Create module
            module = Module.objects.create(
                course=course,
                title=module_data["title"],
                description=module_data["description"],
                order=idx,
                generation_status="generating",
            )

            # Generate lessons for this module
            lessons_data = ai_service.generate_module_content(
                module_title=module.title,
                module_description=module.description,
                course_context=f"{course.title}: {course.description}",
                num_lessons=5,
            )

            # Create lessons
            for lesson_idx, lesson_data in enumerate(lessons_data, 1):
                Lesson.objects.create(
                    module=module, title=lesson_data["title"], content=lesson_data["content"], order=lesson_idx
                )

            # Mark module as completed
            module.generation_status = "completed"
            module.save()

            # Update progress
            current_progress = 20 + (idx * progress_per_module)
            task.progress = int(current_progress)
            task.message = f"Generated module {idx}/{total_modules}: {module.title}"
            task.save()
            send_progress_update(
                task_id,
                {
                    "status": "running",
                    "stage": "creating",
                    "progress": int(current_progress),
                    "message": f"Generated module {idx}/{total_modules}: {module.title}",
                },
            )

        # Stage 3: Generate quiz (70-90%)
        task.current_stage = "reviewing"
        task.progress = 75
        task.message = "Generating quiz questions..."
        task.save()
        send_progress_update(
            task_id,
            {"status": "running", "stage": "reviewing", "progress": 75, "message": "Generating quiz questions..."},
        )

        # Create quiz
        quiz = Quiz.objects.create(course=course, generation_status="generating")

        # Generate summary of modules for quiz context
        modules_summary = "\n".join(
            [f"Module {i + 1}: {m['title']} - {m['description']}" for i, m in enumerate(modules_data)]
        )

        # Generate quiz questions
        questions_data = ai_service.generate_quiz_questions(
            course_title=course.title,
            course_description=course.description,
            modules_summary=modules_summary,
            num_questions=5,
        )

        # Create questions and answers
        for question_idx, question_data in enumerate(questions_data, 1):
            question = Question.objects.create(
                quiz=quiz, text=question_data["text"], type=question_data["type"], order=question_idx
            )

            # Create answers
            for answer_idx, answer_data in enumerate(question_data["answers"], 1):
                Answer.objects.create(
                    question=question, text=answer_data["text"], is_correct=answer_data["is_correct"], order=answer_idx
                )

        # Mark quiz as completed
        quiz.generation_status = "completed"
        quiz.save()

        task.progress = 90
        task.message = f"Generated {len(questions_data)} quiz questions"
        task.save()
        send_progress_update(
            task_id,
            {
                "status": "running",
                "stage": "reviewing",
                "progress": 90,
                "message": f"Generated {len(questions_data)} quiz questions",
            },
        )

        # Stage 4: Finalize (90-100%)
        task.current_stage = "completed"
        task.progress = 95
        task.message = "Finalizing course..."
        task.save()

        # Update course status
        course.status = "draft"
        course.save()

        # Complete task
        task.status = "completed"
        task.progress = 100
        task.message = "Course generation completed successfully!"
        task.save()

        send_progress_update(
            task_id,
            {
                "status": "completed",
                "stage": "completed",
                "progress": 100,
                "message": "Course generation completed successfully!",
            },
        )

        return {"success": True, "message": "Course generated successfully", "course_id": str(course.id)}

    except Exception as e:
        # Handle errors
        error_message = str(e)
        error_trace = traceback.format_exc()

        try:
            task = GenerationTask.objects.get(id=task_id)
            task.status = "failed"
            task.error_message = f"{error_message}\n\n{error_trace}"
            task.save()

            send_progress_update(
                task_id,
                {
                    "status": "failed",
                    "stage": task.current_stage,
                    "progress": task.progress,
                    "message": f"Generation failed: {error_message}",
                },
            )
        except:
            pass

        return {"success": False, "error": error_message}


@shared_task(bind=True)
def generate_module_lessons(self, task_id: str, module_id: str):
    """
    Generate lessons for a specific module
    """
    try:
        task = GenerationTask.objects.get(id=task_id)
        module = Module.objects.get(id=module_id)
        course = module.course

        task.status = "running"
        task.task_id = self.request.id
        task.save()

        send_progress_update(
            task_id,
            {
                "status": "running",
                "stage": "creating",
                "progress": 10,
                "message": f"Generating lessons for {module.title}...",
            },
        )

        # Initialize AI service
        ai_service = AIGenerationService()

        # Update module status
        module.generation_status = "generating"
        module.save()

        # Generate lessons
        lessons_data = ai_service.generate_module_content(
            module_title=module.title,
            module_description=module.description,
            course_context=f"{course.title}: {course.description}",
            num_lessons=5,
        )

        # Delete old lessons and create new ones in a transaction
        # This ensures old lessons remain if generation fails
        with transaction.atomic():
            # Delete existing lessons
            module.lessons.all().delete()

            # Create new lessons
            for idx, lesson_data in enumerate(lessons_data, 1):
                Lesson.objects.create(module=module, title=lesson_data["title"], content=lesson_data["content"], order=idx)

            progress = 20 + (idx * 25)
            send_progress_update(
                task_id,
                {
                    "status": "running",
                    "stage": "creating",
                    "progress": progress,
                    "message": f"Created lesson {idx}/{len(lessons_data)}",
                },
            )

        # Mark module as completed
        module.generation_status = "completed"
        module.save()

        # Complete task
        task.status = "completed"
        task.progress = 100
        task.current_stage = "completed"
        task.message = f"Generated {len(lessons_data)} lessons successfully"
        task.save()

        send_progress_update(
            task_id,
            {
                "status": "completed",
                "stage": "completed",
                "progress": 100,
                "message": f"Generated {len(lessons_data)} lessons successfully",
            },
        )

        return {"success": True, "message": "Lessons generated successfully"}

    except Exception as e:
        error_message = str(e)

        try:
            task = GenerationTask.objects.get(id=task_id)
            task.status = "failed"
            task.error_message = error_message
            task.save()

            # Update module status to failed
            try:
                module = Module.objects.get(id=module_id)
                module.generation_status = "failed"
                module.save()
            except:
                pass

            send_progress_update(task_id, {"status": "failed", "message": f"Generation failed: {error_message}"})
        except:
            pass

        return {"success": False, "error": error_message}


@shared_task(bind=True)
def generate_quiz_questions_task(self, task_id: str, quiz_id: str):
    """
    Generate questions for a specific quiz
    """
    try:
        task = GenerationTask.objects.get(id=task_id)
        quiz = Quiz.objects.get(id=quiz_id)
        course = quiz.course

        task.status = "running"
        task.task_id = self.request.id
        task.save()

        send_progress_update(
            task_id,
            {
                "status": "running",
                "stage": "creating",
                "progress": 10,
                "message": f"Generating quiz questions for {course.title}...",
            },
        )

        # Initialize AI service
        ai_service = AIGenerationService()

        # Update quiz status
        quiz.generation_status = "generating"
        quiz.save()

        # Generate summary of modules for quiz context
        modules = course.modules.all().order_by('order')
        modules_summary = "\n".join(
            [f"Module {m.order}: {m.title} - {m.description}" for m in modules]
        )

        # Generate quiz questions
        questions_data = ai_service.generate_quiz_questions(
            course_title=course.title,
            course_description=course.description,
            modules_summary=modules_summary,
            num_questions=5,
        )

        send_progress_update(
            task_id,
            {
                "status": "running",
                "stage": "creating",
                "progress": 50,
                "message": f"Creating {len(questions_data)} quiz questions...",
            },
        )

        # Delete old questions and create new ones in a transaction
        # This ensures old questions remain if generation fails
        with transaction.atomic():
            # Delete existing questions (and their answers via cascade)
            quiz.questions.all().delete()

            # Create questions and answers
            for question_idx, question_data in enumerate(questions_data, 1):
                question = Question.objects.create(
                    quiz=quiz, text=question_data["text"], type=question_data["type"], order=question_idx
                )

                # Create answers
                for answer_idx, answer_data in enumerate(question_data["answers"], 1):
                    Answer.objects.create(
                        question=question, text=answer_data["text"], is_correct=answer_data["is_correct"], order=answer_idx
                    )

            progress = 50 + (question_idx * 10)
            send_progress_update(
                task_id,
                {
                    "status": "running",
                    "stage": "creating",
                    "progress": min(progress, 90),
                    "message": f"Created question {question_idx}/{len(questions_data)}",
                },
            )

        # Mark quiz as completed
        quiz.generation_status = "completed"
        quiz.save()

        # Complete task
        task.status = "completed"
        task.progress = 100
        task.current_stage = "completed"
        task.message = f"Generated {len(questions_data)} quiz questions successfully"
        task.save()

        send_progress_update(
            task_id,
            {
                "status": "completed",
                "stage": "completed",
                "progress": 100,
                "message": f"Generated {len(questions_data)} quiz questions successfully",
            },
        )

        return {"success": True, "message": "Quiz questions generated successfully"}

    except Exception as e:
        error_message = str(e)

        try:
            task = GenerationTask.objects.get(id=task_id)
            task.status = "failed"
            task.error_message = error_message
            task.save()

            # Update quiz status to failed
            try:
                quiz = Quiz.objects.get(id=quiz_id)
                quiz.generation_status = "failed"
                quiz.save()
            except:
                pass

            send_progress_update(task_id, {"status": "failed", "message": f"Generation failed: {error_message}"})
        except:
            pass

        return {"success": False, "error": error_message}
