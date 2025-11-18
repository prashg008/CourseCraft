from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r"^/?ws/generation/(?P<task_id>[0-9a-fA-F-]+)/?$",
        consumers.GenerationConsumer.as_asgi(),  # type: ignore[arg-type]
    ),
    re_path(
        r"^/?ws/courses/(?P<course_id>[0-9a-fA-F-]+)/generation/?$",
        consumers.GenerationConsumer.as_asgi(),  # type: ignore[arg-type]
    ),
]
