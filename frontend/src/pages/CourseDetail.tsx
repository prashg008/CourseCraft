import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { Button, Badge, Card, CardBody, LoadingSpinner } from '@/components/ui';
import { GenerationStatus, ModuleCard, QuizSection } from '@/components/course';
import { coursesApi, aiApi } from '@/services/api';
import { formatDateWithTime } from '@/utils/date';
import { showError, showSuccess } from '@/utils/toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/context/AuthContext';
import type { Course, CourseStatus } from '@/types';

interface GenerationUpdate {
  task_id: string;
  entity_type: 'course' | 'module' | 'quiz';
  entity_id: string;
  status: string;
  message?: string;
  progress?: number;
}

function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingModuleId, setRegeneratingModuleId] = useState<string | null>(null);
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  // Fetch course data
  const fetchCourse = useCallback(async () => {
    if (!id) return;

    try {
      const response = await coursesApi.getById(id);
      setCourse(response.data);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // WebSocket connection for real-time generation updates
  const { latestMessage } = useWebSocket<GenerationUpdate>({
    courseId: id,
    token,
    enabled: Boolean(id && token),
    retryLimit: -1,
    onMessage: (update) => {
      // When we get an update for module or quiz completion/failure, refresh course data
      if (update.status === 'completed' || update.status === 'failed') {
        fetchCourse();
      }
    },
  });

  // Handle module regeneration
  const handleRegenerateModule = async (moduleId: string) => {
    if (!id) return;

    setRegeneratingModuleId(moduleId);
    try {
      await coursesApi.regenerateModule(id, moduleId);
      showSuccess('Module regeneration started');
      // Fetch immediately to show "generating" status, WebSocket will handle updates
      await fetchCourse();
      setRegeneratingModuleId(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to regenerate module');
      setRegeneratingModuleId(null);
    }
  };

  // Handle quiz regeneration
  const handleRegenerateQuiz = async () => {
    if (!id) return;

    setRegeneratingQuiz(true);
    try {
      await coursesApi.regenerateQuiz(id);
      showSuccess('Quiz regeneration started');
      // Fetch immediately to show "generating" status, WebSocket will handle updates
      await fetchCourse();
      setRegeneratingQuiz(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to regenerate quiz');
      setRegeneratingQuiz(false);
    }
  };

  // Handle publish course
  const handlePublish = async () => {
    if (!id || !course) return;

    setStatusChanging(true);
    try {
      await coursesApi.publish(id);
      showSuccess('Course published successfully');
      fetchCourse();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to publish course');
    } finally {
      setStatusChanging(false);
    }
  };

  // Handle archive course
  const handleArchive = async () => {
    if (!id || !course) return;

    if (!confirm('Are you sure you want to archive this course?')) {
      return;
    }

    setStatusChanging(true);
    try {
      await coursesApi.archive(id);
      showSuccess('Course archived successfully');
      fetchCourse();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to archive course');
    } finally {
      setStatusChanging(false);
    }
  };

  // Handle unarchive course
  const handleUnarchive = async () => {
    if (!id || !course) return;

    setStatusChanging(true);
    try {
      await coursesApi.unarchive(id);
      showSuccess('Course unarchived successfully');
      fetchCourse();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to unarchive course');
    } finally {
      setStatusChanging(false);
    }
  };

  // Handle regenerate entire course
  const handleRegenerateCourse = async () => {
    if (!id || !course) return;

    if (!confirm('Are you sure you want to regenerate the entire course? This will replace all modules, lessons, and quiz questions with new AI-generated content.')) {
      return;
    }

    setStatusChanging(true);
    try {
      await aiApi.generateCourse(id);
      showSuccess('Course regeneration started! Watch the progress below.');
      fetchCourse();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to start course regeneration');
    } finally {
      setStatusChanging(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: CourseStatus) => {
    const variants: Record<CourseStatus, 'draft' | 'published' | 'generating' | 'default'> = {
      draft: 'draft',
      published: 'published',
      generating: 'generating',
      archived: 'default',
    };
    return variants[status];
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading course...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Course not found</h2>
              <p className="text-gray-600 mb-6">The course you're looking for doesn't exist.</p>
              <Link to="/">
                <Button variant="primary">Back to Courses</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Courses
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <Badge variant={getStatusVariant(course.status)}>
                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                </Badge>
                {course.status === 'generating' && <LoadingSpinner size="sm" />}
              </div>
              <p className="text-gray-600">{course.description}</p>
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                <span>Created {formatDateWithTime(course.createdAt)}</span>
                <span>•</span>
                <span>Last updated {formatDateWithTime(course.updatedAt)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 ml-4">
              {course.status === 'draft' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePublish}
                  loading={statusChanging}
                  disabled={statusChanging || course.modules.length === 0}
                >
                  Publish Course
                </Button>
              )}
              {(course.status === 'published' || course.status === 'draft') && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleRegenerateCourse}
                    loading={statusChanging}
                    disabled={statusChanging}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Regenerate Course
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleArchive}
                    loading={statusChanging}
                    disabled={statusChanging}
                  >
                    Archive
                  </Button>
                </>
              )}
              {course.status === 'archived' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleUnarchive}
                  loading={statusChanging}
                  disabled={statusChanging}
                >
                  Unarchive
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Generation Status Message */}
        {course.status === 'generating' && course.id && (
          <GenerationStatus
            courseId={course.id}
            onComplete={fetchCourse}
            onRegenerate={fetchCourse}
          />
        )}

        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{course.modules.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Lessons</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Quiz Questions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {course.quiz?.questions.length ?? 0}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Modules Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Modules</h2>
          {course.modules.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">
                    No modules yet. They will appear here once generation is complete.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  moduleNumber={index + 1}
                  onRegenerate={handleRegenerateModule}
                  isRegenerating={regeneratingModuleId === module.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quiz Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Quiz</h2>
          <QuizSection
            quiz={course.quiz}
            onRegenerate={handleRegenerateQuiz}
            onUpdate={fetchCourse}
            isRegenerating={regeneratingQuiz}
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default CourseDetail;
