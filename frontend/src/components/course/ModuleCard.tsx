import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardBody, Button, Badge } from '@/components/ui';
import type { Module } from '@/types';

interface ModuleCardProps {
  module: Module;
  moduleNumber: number;
  onRegenerate: (moduleId: string) => void;
  isRegenerating?: boolean;
}

const markdownComponents: Components = {
  a: ({ node: _node, className, children, ...props }) => {
    void _node;
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className={[className, 'text-blue-600 underline'].filter(Boolean).join(' ')}
      >
        {children}
      </a>
    );
  },
};

export function ModuleCard({
  module,
  moduleNumber,
  onRegenerate,
  isRegenerating = false,
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardBody className="p-0">
        {/* Module Header */}
        <div className="p-6 border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white font-bold text-base shadow-sm">
                  {moduleNumber}
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
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
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      {module.title}
                    </h3>
                    {module.generationStatus && (
                      <Badge
                        variant={module.generationStatus === 'completed' ? 'success' : 'generating'}
                      >
                        {module.generationStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 ml-[52px] leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {module.description || ''}
                </ReactMarkdown>
              </div>
              <div className="flex items-center space-x-4 mt-3 ml-[52px] text-xs text-gray-600">
                <span className="flex items-center px-2 py-1 bg-white rounded-md border border-gray-200">
                  <svg
                    className="w-4 h-4 mr-1.5 text-blue-600"
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
                  <span className="font-medium">
                    {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? (
                  <>
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
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    Collapse
                  </>
                ) : (
                  <>
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Expand
                  </>
                )}
              </Button>
              {/* <Button
                variant="secondary"
                size="sm"
                onClick={() => onRegenerate(module.id)}
                loading={isRegenerating}
                disabled={isRegenerating}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate
              </Button> */}
            </div>
          </div>
        </div>

        {/* Lessons */}
        {isExpanded && (
          <div className="divide-y divide-gray-200">
            {module.lessons.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No lessons in this module yet.</p>
              </div>
            ) : (
              module.lessons.map((lesson, index) => {
                const isLessonExpanded = expandedLessons.has(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className="p-6 pl-8 hover:bg-blue-50/50 transition-colors border-l-4 border-transparent hover:border-l-blue-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-300">
                            {index + 1}
                          </span>
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-gray-400"
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
                            <h4 className="text-base font-semibold text-gray-800">
                              {lesson.title}
                            </h4>
                          </div>
                        </div>

                        {/* Lesson Content */}
                        <div className="ml-10 pl-2 border-l-2 border-gray-200">
                          {isLessonExpanded ? (
                            <div className="mt-3 text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm prose prose-sm max-w-none">
                              <ReactMarkdown components={markdownComponents}>
                                {lesson.content || ''}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 line-clamp-2 mt-2 prose prose-sm max-w-none">
                              <ReactMarkdown components={markdownComponents}>
                                {lesson.content || ''}
                              </ReactMarkdown>
                            </div>
                          )}

                          <button
                            onClick={() => toggleLesson(lesson.id)}
                            className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                          >
                            {isLessonExpanded ? (
                              <>
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
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                                Show less
                              </>
                            ) : (
                              <>
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
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                                Read more
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
