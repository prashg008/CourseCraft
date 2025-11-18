from django.apps import AppConfig


class CoursesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "courses"

    def ready(self):
        # Import signals to trigger AI generation on course creation
        import courses.signals  # noqa: F401
