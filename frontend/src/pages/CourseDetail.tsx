import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import {
  Button,
  Badge,
  Card,
  CardBody,
  LoadingSpinner,
  ConfirmDialog,
  Modal,
  Input,
} from '@/components/ui';
import { GenerationStatus, ModuleCard, QuizSection } from '@/components/course';
import { coursesApi, aiApi } from '@/services/api';
import { formatDateWithTime } from '@/utils/date';
import { showError, showSuccess } from '@/utils/toast';
import { useCourseGeneration } from '@/websocket';
import type { Course, CourseStatus } from '@/types';

type TabType = 'overview' | 'modules' | 'quiz';

function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<'archive' | 'regenerate-course' | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editErrors, setEditErrors] = useState<{ title?: string; description?: string }>({});
  const courseId = course?.id;
  const courseStatus = course?.status;

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
  const { data: generationUpdate } = useCourseGeneration(id || '');

  // Refresh course data when generation completes or fails
  useEffect(() => {
    if (
      generationUpdate &&
      (generationUpdate.status === 'completed' || generationUpdate.status === 'failed')
    ) {
      fetchCourse();
    }
  }, [generationUpdate, fetchCourse]);

  // Reflect websocket progress locally so UI shows real-time generating state
  useEffect(() => {
    if (!generationUpdate || !courseId) {
      return;
    }

    if (generationUpdate.courseId !== courseId) {
      return;
    }

    const isInProgress =
      generationUpdate.status === 'generating' || generationUpdate.status === 'pending';

    if (isInProgress && courseStatus !== 'generating') {
      setCourse(prevCourse => (prevCourse ? { ...prevCourse, status: 'generating' } : prevCourse));
    }
  }, [generationUpdate, courseId, courseStatus]);

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
  const handleArchive = () => {
    setPendingConfirm('archive');
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
  const handleRegenerateCourse = () => {
    setPendingConfirm('regenerate-course');
  };

  const openEditModal = () => {
    if (!course) return;
    setEditForm({ title: course.title, description: course.description });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (savingDetails) return;
    setIsEditModalOpen(false);
  };

  const validateEditForm = () => {
    const errors: { title?: string; description?: string } = {};
    if (!editForm.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!editForm.description.trim()) {
      errors.description = 'Description is required';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditFieldChange = (field: 'title' | 'description', value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCourseDetailsSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!id || !validateEditForm()) {
      return;
    }

    setSavingDetails(true);
    try {
      await coursesApi.updateDetails(id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
      });
      showSuccess('Course details updated successfully');
      setIsEditModalOpen(false);
      await fetchCourse();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update course details');
    } finally {
      setSavingDetails(false);
    }
  };

  const closeConfirmDialog = () => {
    if (confirmLoading) {
      return;
    }
    setPendingConfirm(null);
  };

  const handleConfirmAction = async () => {
    if (!id || !course || !pendingConfirm) {
      return;
    }

    setConfirmLoading(true);
    setStatusChanging(true);

    try {
      if (pendingConfirm === 'archive') {
        await coursesApi.archive(id);
        showSuccess('Course archived successfully');
      } else {
        await aiApi.generateCourse(id);
        showSuccess('Course regeneration started! Watch the progress below.');
      }

      await fetchCourse();
    } catch (error) {
      const defaultMessage =
        pendingConfirm === 'archive'
          ? 'Failed to archive course'
          : 'Failed to start course regeneration';
      showError(error instanceof Error ? error.message : defaultMessage);
    } finally {
      setConfirmLoading(false);
      setStatusChanging(false);
      setPendingConfirm(null);
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

  // Calculate stats
  const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const totalQuestions = course.quiz?.questions.length ?? 0;

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
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
                      <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Course Information */}
            <Card>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About this course</h3>
                    <p className="text-gray-700 leading-relaxed">{course.description}</p>
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Course Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Created:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {formatDateWithTime(course.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last updated:</span>{' '}
                        <span className="text-gray-900 font-medium">
                          {formatDateWithTime(course.updatedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>{' '}
                        <Badge variant={getStatusVariant(course.status)} className="ml-2">
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Quick Actions removed for course detail view */}
          </div>
        );

      case 'modules':
        return (
          <div className="space-y-4">
            {course.modules.length === 0 ? (
              <Card>
                <CardBody>
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
                    <p className="text-sm">
                      Modules will appear here once course generation is complete.
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              course.modules.map((module, index) => (
                <ModuleCard key={module.id} module={module} moduleNumber={index + 1} />
              ))
            )}
          </div>
        );

      case 'quiz':
        return (
          <QuizSection
            quiz={course.quiz}
            onRegenerate={handleRegenerateQuiz}
            onUpdate={fetchCourse}
            isRegenerating={regeneratingQuiz}
          />
        );
    }
  };

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

          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <Badge variant={getStatusVariant(course.status)}>
                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </Badge>
              {course.status === 'generating' && <LoadingSpinner size="sm" />}
            </div>
            <p className="text-gray-600 mb-4">{course.description}</p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="md" onClick={openEditModal} disabled={statusChanging}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </Button>
              {course.status === 'draft' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePublish}
                  loading={statusChanging}
                  disabled={statusChanging || course.modules.length === 0}
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Publish
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
                    Regenerate
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleArchive}
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
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
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

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'modules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Modules
                {course.modules.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {course.modules.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'quiz'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Quiz
                {totalQuestions > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {totalQuestions}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-8">{renderTabContent()}</div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Course Details"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={closeEditModal}
              disabled={savingDetails}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="course-details-form"
              variant="primary"
              loading={savingDetails}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form id="course-details-form" className="space-y-4" onSubmit={handleCourseDetailsSubmit}>
          <Input
            label="Title"
            placeholder="Course title"
            value={editForm.title}
            onChange={event => handleEditFieldChange('title', event.target.value)}
            error={editErrors.title}
          />
          <Input
            label="Description"
            placeholder="Course description"
            value={editForm.description}
            onChange={event => handleEditFieldChange('description', event.target.value)}
            error={editErrors.description}
            variant="textarea"
            rows={5}
          />
        </form>
      </Modal>

      {/* Confirm Dialog */}
      {pendingConfirm && (
        <ConfirmDialog
          isOpen={Boolean(pendingConfirm)}
          title={pendingConfirm === 'archive' ? 'Archive course' : 'Regenerate course'}
          message={
            pendingConfirm === 'archive'
              ? 'Are you sure you want to archive this course?'
              : 'Are you sure you want to regenerate the entire course? This will replace all modules, lessons, and quiz questions with fresh AI-generated content.'
          }
          confirmLabel={pendingConfirm === 'archive' ? 'Archive course' : 'Regenerate course'}
          cancelLabel="Cancel"
          confirmVariant="danger"
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={closeConfirmDialog}
        />
      )}
    </MainLayout>
  );
}

export default CourseDetail;
