from typing import Dict, List, Optional, Any, Union
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field
from django.conf import settings
from .models import LLMConfig
import json


class LessonContent(BaseModel):
    """Schema for a single lesson"""
    title: str = Field(description="Clear, descriptive lesson title")
    content: str = Field(description="Comprehensive lesson content with at least 3-4 paragraphs")


class ModuleContent(BaseModel):
    """Schema for a module with lessons"""
    title: str = Field(description="Module title")
    description: str = Field(description="Module description")
    lessons: List[LessonContent] = Field(description="List of lessons", min_length=1)


class QuizQuestion(BaseModel):
    """Schema for a quiz question"""

    text: str = Field(description="Question text")
    type: str = Field(description="Question type: 'mcq' or 'single_choice'")
    answers: List[Dict[str, Any]] = Field(description="List of answers with text and is_correct fields")


class AIGenerationService:
    """Service for AI-powered course content generation"""

    def __init__(self):
        self.llm = self._get_llm()

    def _get_llm(self) -> BaseChatModel:
        """Get the configured LLM instance based on active provider"""
        # Try to get active LLM config from database
        try:
            config = LLMConfig.objects.filter(is_active=True).first()

            if config:
                provider = config.provider
                api_key = config.api_key
                model_name = config.model_name
            else:
                # Fallback to OpenAI from environment
                provider = "openai"
                api_key = settings.OPENAI_API_KEY
                model_name = "gpt-4o-mini"
        except:
            # Fallback to OpenAI from environment
            provider = "openai"
            api_key = settings.OPENAI_API_KEY
            model_name = "gpt-4o-mini"

        if not api_key:
            raise ValueError(f"API key not configured for provider: {provider}")

        # Initialize the appropriate LLM based on provider
        default_google_model = "gemini-2.5-flash-lite"
        supported_google_models = {"gemini-1.5-pro", "gemini-1.5-v1", "gemini-1.0-pro"}

        if provider == "openai":
            return ChatOpenAI(model=model_name, api_key=api_key, temperature=0.7)
        elif provider == "anthropic":
            return ChatAnthropic(model=model_name, anthropic_api_key=api_key, temperature=0.7)
        elif provider == "google":
            chosen_model = model_name or default_google_model
            if chosen_model not in supported_google_models:
                chosen_model = default_google_model

            return ChatGoogleGenerativeAI(model=chosen_model, google_api_key=api_key, temperature=0.7)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    def generate_course_outline(self, title: str, description: str, num_modules: int = 5) -> List[Dict]:
        """
        Generate a course outline with modules
        """
        prompt = ChatPromptTemplate.from_template("""
You are an expert course designer. Create a detailed course outline for the following course:

Title: {title}
Description: {description}
Number of Modules: {num_modules}

For each module, provide:
1. A clear, descriptive title
2. A detailed description (2-3 sentences) explaining what will be covered

Return your response as a JSON array of modules, where each module has 'title' and 'description' fields.
Example format:
[
    {{"title": "Module Title", "description": "Module description here."}},
    ...
]

Only return the JSON array, no additional text.
        """)

        chain = prompt | self.llm
        response = chain.invoke({"title": title, "description": description, "num_modules": num_modules})

        # Parse the JSON response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        return json.loads(content)

    def generate_module_content(
        self, module_title: str, module_description: str, course_context: str, num_lessons: int = 5
    ) -> List[Dict]:
        """
        Generate lesson content for a module using structured output
        """
        # Create a list model for multiple lessons
        class LessonsList(BaseModel):
            lessons: List[LessonContent] = Field(description="List of lessons", min_length=1)

        prompt = ChatPromptTemplate.from_template("""
You are an expert instructional designer. Create exactly {num_lessons} detailed lessons for the following module:

Course Context: {course_context}
Module Title: {module_title}
Module Description: {module_description}

IMPORTANT: You must create exactly {num_lessons} lessons. Do not create fewer or more.

For each lesson, provide:
1. A clear, descriptive title
2. Comprehensive content (at least 3-4 paragraphs) that teaches the topic thoroughly

The content should be educational, well-structured, and include:
- Clear explanations
- Examples where appropriate
- Key takeaways
        """)

        try:
            # Use structured output to guarantee valid JSON
            structured_llm = self.llm.with_structured_output(LessonsList)
            chain = prompt | structured_llm

            response = chain.invoke(
                {
                    "course_context": course_context,
                    "module_title": module_title,
                    "module_description": module_description,
                    "num_lessons": num_lessons,
                }
            )

            # Convert Pydantic models to dictionaries
            lessons = [{"title": lesson.title, "content": lesson.content} for lesson in response.lessons]

            # Validate that we got at least 1 lesson
            if not lessons or len(lessons) == 0:
                raise ValueError(f"AI generated 0 lessons for module '{module_title}'. Expected at least 1 lesson.")

            return lessons

        except Exception as e:
            # If structured output fails, fall back to the old JSON parsing method
            print(f"\n{'='*80}")
            print(f"Structured output failed for module: {module_title}")
            print(f"Error: {str(e)}")
            print(f"Falling back to JSON parsing method...")
            print(f"{'='*80}\n")

            # Fallback to original JSON parsing
            chain = prompt | self.llm
            response = chain.invoke(
                {
                    "course_context": course_context,
                    "module_title": module_title,
                    "module_description": module_description,
                    "num_lessons": num_lessons,
                }
            )

            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            try:
                lessons = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"\n{'='*80}")
                print(f"JSON Parse Error for module: {module_title}")
                print(f"Error: {str(e)}")
                print(f"Response length: {len(content)} chars")
                print(f"\nFull AI Response:")
                print(content)
                print(f"{'='*80}\n")

                # Try repair strategies
                fixed_content = content.replace(",]", "]").replace(",}", "}")

                import re
                # Fix newlines in strings - extract replacement outside f-string
                def fix_newlines(match):
                    text = match.group(1).replace(chr(10), r'\n')
                    return f': "{text}"'

                fixed_content = re.sub(r':\s*"([^"]*\n[^"]*)"', fix_newlines, fixed_content)

                try:
                    lessons = json.loads(fixed_content)
                    print(f"✓ Successfully repaired JSON for module '{module_title}'")
                except json.JSONDecodeError as e2:
                    print(f"All repair attempts failed. Error: {str(e2)}")
                    raise ValueError(f"AI returned invalid JSON for module '{module_title}': {str(e)}\n\nSee logs for full response.")

            if not lessons or len(lessons) == 0:
                raise ValueError(f"AI generated 0 lessons for module '{module_title}'. Expected at least 1 lesson.")

            return lessons

    def generate_quiz_questions(
        self, course_title: str, course_description: str, modules_summary: str, num_questions: int = 5
    ) -> List[Dict]:
        """
        Generate quiz questions for the entire course
        """
        prompt = ChatPromptTemplate.from_template("""
You are an expert assessment designer. Create upto {num_questions} quiz questions to test understanding of the following course:

Course Title: {course_title}
Course Description: {course_description}
Modules Summary: {modules_summary}

For each question, provide:
1. Clear question text
2. Question type: either "single_choice" (one correct answer) or "mcq" (multiple correct answers)
3. 4 answer options with clear indication of which are correct

Ensure questions cover different aspects of the course and vary in difficulty.

Return your response as a JSON array of questions with this exact format:
[
    {{
        "text": "Question text here?",
        "type": "single_choice",
        "answers": [
            {{"text": "Answer 1", "is_correct": true}},
            {{"text": "Answer 2", "is_correct": false}},
            {{"text": "Answer 3", "is_correct": false}},
            {{"text": "Answer 4", "is_correct": false}}
        ]
    }},
    ...
]

Only return the JSON array, no additional text.
        """)

        chain = prompt | self.llm
        response = chain.invoke(
            {
                "course_title": course_title,
                "course_description": course_description,
                "modules_summary": modules_summary,
                "num_questions": num_questions,
            }
        )

        # Parse the JSON response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        return json.loads(content)

    def refine_content(self, content: str, feedback: str) -> str:
        """
        Refine existing content based on feedback
        """
        prompt = ChatPromptTemplate.from_template("""
You are an expert content editor. Improve the following content based on the feedback provided:

Original Content:
{content}

Feedback:
{feedback}

Provide the refined content that addresses the feedback while maintaining the educational value and structure.
Return only the improved content, no additional commentary.
        """)

        chain = prompt | self.llm
        response = chain.invoke({"content": content, "feedback": feedback})

        return response.content.strip()
