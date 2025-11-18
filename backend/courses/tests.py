from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from .models import Course


class CourseListFiltersTests(APITestCase):
    def setUp(self):
        self.list_url = reverse("course-list")
        self.user = User.objects.create_user(username="alice", password="password")
        self.other_user = User.objects.create_user(username="bob", password="password")

        self.course_python = Course.objects.create(
            title="Python Basics",
            description="Intro to python programming",
            status="draft",
            owner=self.user,
        )
        self.course_design = Course.objects.create(
            title="UI Design Systems",
            description="Design tokens and systems",
            status="published",
            owner=self.user,
        )
        self.course_archived = Course.objects.create(
            title="Legacy Architecture",
            description="Patterns",
            status="archived",
            owner=self.user,
        )
        Course.objects.create(
            title="Not Yours",
            description="Should not be listed",
            status="draft",
            owner=self.other_user,
        )

        self.client.force_authenticate(self.user)

    def test_search_filters_by_title_or_description(self):
        response = self.client.get(self.list_url, {"search": "design"})
        self.assertEqual(response.status_code, 200)
        titles = [course["title"] for course in response.data["results"]]
        self.assertEqual(titles, ["UI Design Systems"])

    def test_status_filter_includes_only_matching_status(self):
        response = self.client.get(self.list_url, {"status": "published"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.course_design.id))

    def test_status_all_returns_all_user_courses(self):
        response = self.client.get(self.list_url, {"status": "all"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

    def test_ordering_by_title(self):
        response = self.client.get(self.list_url, {"ordering": "title"})
        self.assertEqual(response.status_code, 200)
        titles = [course["title"] for course in response.data["results"]]
        self.assertEqual(titles, sorted(titles))
