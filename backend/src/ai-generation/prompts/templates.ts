export const COURSE_GENERATION_PROMPT = `You are an expert course designer. Create a comprehensive, well-structured course based on the following requirements.

Course Title: {title}
Course Description: {description}

Generate a complete course with 3-12 modules. Each module should have:
- A clear, descriptive title (5-255 characters)
- A comprehensive description explaining what students will learn (20-1000 characters)
- 2-10 lessons per module

Each lesson should have:
- A clear title (5-255 characters)
- Rich, educational content in markdown format
- Proper order/sequence

Also create a comprehensive quiz with 5-20 questions covering key concepts from all modules.

Each question should:
- Be clear and well-written (10-1000 characters)
- Have 2-6 answer options
- Specify type: "mcq" (multiple correct answers) or "single_choice" (one correct answer)
- Include at least one correct answer

IMPORTANT REQUIREMENTS:
- Content must be educational, accurate, and well-structured
- Use proper markdown formatting for lessons (headers, lists, code blocks, etc.)
- Ensure logical progression from basic to advanced concepts
- Make questions challenging but fair
- Provide clear, unambiguous correct answers
- Maintain consistent quality across all modules and lessons

Return the course structure as a JSON object following this exact format:
{
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "order": 0,
      "lessons": [
        {
          "title": "Lesson Title",
          "content": "Lesson content in markdown",
          "order": 0
        }
      ]
    }
  ],
  "quiz": {
    "questions": [
      {
        "text": "Question text",
        "type": "single_choice",
        "order": 0,
        "answers": [
          {
            "text": "Answer text",
            "isCorrect": true,
            "order": 0
          }
        ]
      }
    ]
  }
}`;

export const MODULE_GENERATION_PROMPT = `You are an expert course designer. Create a single, high-quality course module.

Course Context:
Title: {courseTitle}
Description: {courseDescription}

Existing Modules (for context):
{existingModules}

{feedback}

Generate ONE module with:
- A clear, descriptive title (5-255 characters)
- A comprehensive description
- 2-10 well-structured lessons

Each lesson should have:
- Clear title (5-255 characters)
- Rich educational content in markdown
- Proper sequencing

IMPORTANT:
- Ensure this module fits logically with existing modules
- Don't duplicate content from existing modules
- Maintain high educational quality
- Use proper markdown formatting
- Progress logically from basic to advanced concepts

Return as JSON:
{
  "title": "Module Title",
  "description": "Module description",
  "order": {moduleOrder},
  "lessons": [
    {
      "title": "Lesson Title",
      "content": "Lesson content in markdown",
      "order": 0
    }
  ]
}`;

export const QUIZ_GENERATION_PROMPT = `You are an expert assessment designer. Create a comprehensive quiz covering the course content.

Course Content:
{courseContent}

{feedback}

Generate a quiz with 5-20 questions that:
- Cover key concepts from across all modules
- Range from basic to advanced difficulty
- Test understanding, not just memorization
- Have clear, unambiguous correct answers

Each question should:
- Be well-written and clear (10-1000 characters)
- Have 2-6 answer options
- Specify type: "mcq" (multiple correct) or "single_choice" (one correct)
- Include at least one correct answer
- Have properly ordered answers

IMPORTANT:
- Ensure questions are challenging but fair
- Avoid trick questions
- Cover diverse topics from the course
- Make wrong answers plausible but clearly incorrect

Return as JSON:
{
  "questions": [
    {
      "text": "Question text",
      "type": "single_choice",
      "order": 0,
      "answers": [
        {
          "text": "Answer text",
          "isCorrect": true,
          "order": 0
        }
      ]
    }
  ]
}`;

export const REVIEW_PROMPT = `You are a quality reviewer for educational content. Evaluate the following content and provide a detailed assessment.

Content to Review:
{content}

Original Requirements:
{originalPrompt}

Evaluate based on these criteria:
1. **Educational Quality** (30 points): Is the content accurate, clear, and well-explained?
2. **Structure & Organization** (25 points): Is the content well-organized and logically sequenced?
3. **Completeness** (25 points): Does it fully address the requirements?
4. **Technical Accuracy** (20 points): Are there any errors or inaccuracies?

Provide your assessment as JSON:
{
  "qualityScore": 85,
  "approved": true,
  "issues": [
    "Specific issue description"
  ],
  "suggestions": [
    "Specific improvement suggestion"
  ],
  "summary": "Brief overall assessment"
}

SCORING GUIDE:
- 90-100: Excellent quality, minimal improvements needed
- 70-89: Good quality, some improvements recommended
- 50-69: Acceptable quality, several improvements needed
- Below 50: Poor quality, needs regeneration

Score honestly and provide constructive feedback. Set "approved" to true only if score >= 50.`;

export const REVISION_PROMPT = `You are an expert course designer. Improve the following content based on the review feedback.

Original Content:
{content}

Review Feedback:
Quality Score: {qualityScore}/100
Issues Identified:
{issues}

Improvement Suggestions:
{suggestions}

TASK: Revise the content to address all issues and implement the suggestions while maintaining the same overall structure and format.

IMPORTANT:
- Fix all identified issues
- Implement suggested improvements
- Maintain or improve educational quality
- Keep the same JSON structure
- Don't remove or fundamentally change good existing content
- Focus on enhancing clarity, accuracy, and completeness

Return the improved content in the EXACT same JSON format as the original.`;

export function formatCourseGenerationPrompt(title: string, description: string): string {
  return COURSE_GENERATION_PROMPT.replace('{title}', title).replace('{description}', description);
}

export function formatModuleGenerationPrompt(
  courseTitle: string,
  courseDescription: string,
  existingModules: string,
  moduleOrder: number,
  feedback?: string,
): string {
  return MODULE_GENERATION_PROMPT.replace('{courseTitle}', courseTitle)
    .replace('{courseDescription}', courseDescription)
    .replace('{existingModules}', existingModules)
    .replace('{moduleOrder}', moduleOrder.toString())
    .replace('{feedback}', feedback ? `\nUser Feedback: ${feedback}\n` : '');
}

export function formatQuizGenerationPrompt(courseContent: string, feedback?: string): string {
  return QUIZ_GENERATION_PROMPT.replace('{courseContent}', courseContent).replace(
    '{feedback}',
    feedback ? `\nUser Feedback: ${feedback}\n` : '',
  );
}

export function formatReviewPrompt(content: string, originalPrompt: string): string {
  return REVIEW_PROMPT.replace('{content}', JSON.stringify(content, null, 2)).replace(
    '{originalPrompt}',
    originalPrompt,
  );
}

export function formatRevisionPrompt(
  content: string,
  qualityScore: number,
  issues: string[],
  suggestions: string[],
): string {
  return REVISION_PROMPT.replace('{content}', JSON.stringify(content, null, 2))
    .replace('{qualityScore}', qualityScore.toString())
    .replace('{issues}', issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n'))
    .replace('{suggestions}', suggestions.map((sug, i) => `${i + 1}. ${sug}`).join('\n'));
}
