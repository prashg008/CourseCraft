import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { Button, Input, Card, CardHeader, CardBody } from '@/components/ui';
import { coursesApi } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';
import type { CourseFormData } from '@/types';

interface FormErrors {
  title?: string;
  description?: string;
}

function CreateCourse() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must not exceed 100 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await coursesApi.create(formData);

      showSuccess('Course creation started! AI is now generating your course content.');

      // Redirect to the course detail page
      navigate(`/courses/${response.data.id}`);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to create course. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout maxWidth="2xl">
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="text-gray-600 mt-2">
            Provide a title and description for your course. Our AI will generate comprehensive
            content including modules, lessons, and quizzes.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Course Details</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <Input
                label="Course Title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                placeholder="e.g., Introduction to Machine Learning"
                helperText={`${formData.title.length}/100 characters`}
                disabled={loading}
                required
              />

              {/* Description */}
              <Input
                label="Course Description"
                variant="textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Provide a detailed description of what students will learn in this course..."
                helperText={`${formData.description.length}/500 characters`}
                rows={6}
                disabled={loading}
                required
              />

              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Our AI will analyze your course description</li>
                      <li>Generate relevant modules and lessons</li>
                      <li>Create a comprehensive quiz to test knowledge</li>
                      <li>Review and refine the content for quality</li>
                    </ul>
                    <p className="mt-2 text-blue-700">
                      The course will be saved as a <strong>draft</strong> so you can review and
                      edit before publishing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <Link to="/">
                  <Button type="button" variant="ghost" size="md" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  {loading ? 'Creating Course...' : 'Generate Course with AI'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Tips for best results</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Be specific:</strong> Include key topics and learning objectives in your
                  description
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Define the audience:</strong> Mention if the course is for beginners,
                  intermediate, or advanced learners
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Include prerequisites:</strong> Specify any required knowledge or skills
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Mention outcomes:</strong> Describe what students will be able to do after
                  completing the course
                </span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </MainLayout>
  );
}

export default CreateCourse;
