from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/generation/(?P<task_id>[0-9a-f-]+)/$", consumers.GenerationConsumer.as_asgi()),
    re_path(r"^ws/courses/(?P<course_id>[0-9a-f-]+)/generation/$", consumers.GenerationConsumer.as_asgi()),
]