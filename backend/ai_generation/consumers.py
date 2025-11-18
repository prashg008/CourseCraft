import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ValidationError
from .models import GenerationTask


class GenerationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time generation task updates
    Supports multiple concurrent tasks (course, module, quiz) per course
    """

    async def connect(self):
        route_kwargs = self.scope.get("url_route", {}).get("kwargs", {})
        self.course_id = route_kwargs.get("course_id")

        if not self.course_id:
            await self.close(code=4400)
            return

        # Join course-level group to receive updates for ALL tasks for this course
        self.course_group_name = f"course_{self.course_id}"
        await self.channel_layer.group_add(self.course_group_name, self.channel_name)

        await self.accept()

        # Send current status for all active tasks on connection
        all_tasks_data = await self.get_all_active_tasks()
        if all_tasks_data:
            await self.send(text_data=json.dumps({"type": "all_tasks_status", "data": all_tasks_data}))

    async def disconnect(self, close_code):
        # Leave course group
        if hasattr(self, "course_group_name") and self.course_group_name:
            await self.channel_layer.group_discard(self.course_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        data = json.loads(text_data)
        message_type = data.get("type")

        if message_type == "get_status":
            # Send current status for all active tasks
            all_tasks_data = await self.get_all_active_tasks()
            if all_tasks_data:
                await self.send(text_data=json.dumps({"type": "all_tasks_status", "data": all_tasks_data}))

    async def generation_update(self, event):
        """
        Receive generation update from task and send to WebSocket
        Includes entity_type and entity_id to identify which entity is being updated
        """
        await self.send(text_data=json.dumps({"type": "generation_update", "data": event["data"]}))

    @database_sync_to_async
    def get_all_active_tasks(self):
        """Get all active or recent tasks for this course with entity information"""
        try:
            tasks = GenerationTask.objects.filter(
                course_id=self.course_id
            ).order_by("-created_at")[:10]  # Get last 10 tasks

            return [
                {
                    "id": str(task.id),
                    "course_id": str(task.course_id),
                    "entity_type": task.entity_type,
                    "entity_id": task.entity_id,
                    "status": task.status,
                    "current_stage": task.current_stage,
                    "progress": task.progress,
                    "message": task.message,
                    "error_message": task.error_message,
                    "created_at": task.created_at.isoformat(),
                    "updated_at": task.updated_at.isoformat(),
                }
                for task in tasks
            ]
        except (ValueError, ValidationError):
            return []
