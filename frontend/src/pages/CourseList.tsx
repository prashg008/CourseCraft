import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import {
  Button,
  Input,
  Card,
  CardBody,
  Badge,
  LoadingSpinner,
  SkeletonCard,
} from '@/components/ui';
import { coursesApi } from '@/services/api';
import { formatDateShort } from '@/utils/date';
import { showError } from '@/utils/toast';
import type { Course, CourseStatus, CourseFilters } from '@/types';

function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 6;

  // Fetch courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const filters: CourseFilters = {
        search: search || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      };

      const response = await coursesApi.getAll(filters);
      setCourses(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCourses();
  }, [search, statusFilter, sortBy, sortOrder, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  // Get status badge variant
  const getStatusVariant = (status: CourseStatus) => {
    const variants: Record<CourseStatus, 'draft' | 'published' | 'generating' | 'default'> = {
      draft: 'draft',
      published: 'published',
      generating: 'generating',
      archived: 'default',
    };
    return variants[status] || 'default';
  };

  const getModuleCount = (course: Course) => {
    if (typeof course.moduleCount === 'number') {
      return course.moduleCount;
    }
    return course.modules?.length ?? 0;
  };

  const getQuestionCount = (course: Course) => {
    if (typeof course.quizQuestionCount === 'number') {
      return course.quizQuestionCount;
    }
    return course.quiz?.questions?.length ?? 0;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-600 mt-1">
              {total} {total === 1 ? 'course' : 'courses'} found
            </p>
          </div>
          <Link to="/courses/create">
            <Button variant="primary" size="md">
              + Create Course
            </Button>
          </Link>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <Input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as CourseStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="generating">Generating</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={e => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as [
                      'date' | 'title',
                      'asc' | 'desc',
                    ];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-desc">Title (A-Z)</option>
                  <option value="title-asc">Title (Z-A)</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating a new course'}
                </p>
                {!search && statusFilter === 'all' && (
                  <div className="mt-6">
                    <Link to="/courses/create">
                      <Button variant="primary" size="md">
                        + Create Course
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Course Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <Link key={course.id} to={`/courses/${course.id}`} className="group">
                  <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary-300">
                    <CardBody className="flex flex-col h-full">
                      {/* Status Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant={getStatusVariant(course.status)}>
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </Badge>
                        {course.status === 'generating' && <LoadingSpinner size="sm" />}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4 flex-grow line-clamp-3">
                        {course.description}
                      </p>

                      {/* Meta Info */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
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
                              {getModuleCount(course)} modules
                            </span>
                            <span className="flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
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
                              {getQuestionCount(course)} questions
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Updated {formatDateShort(course.updatedAt)}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.5rem] px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default CourseList;
