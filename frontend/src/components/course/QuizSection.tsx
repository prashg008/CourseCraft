import { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Badge,
  Modal,
  LoadingSpinner,
  ConfirmDialog,
} from '@/components/ui';
import { QuestionForm } from './QuestionForm';
import { questionsApi } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import type { Quiz, Question, QuestionFormData } from '@/types';

interface QuizSectionProps {
  quiz?: Quiz | null;
  onRegenerate: () => void;
  onUpdate: () => void; // Callback to refresh course data
  isRegenerating?: boolean;
}

export function QuizSection({
  quiz,
  onRegenerate,
  onUpdate,
  isRegenerating = false,
}: QuizSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Get question type badge
  const getQuestionTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
      single_choice: { label: 'Single Choice', variant: 'default' },
      mcq: { label: 'Multiple Choice', variant: 'success' },
      boolean: { label: 'True/False', variant: 'warning' },
    };
    return types[type] || { label: type, variant: 'default' };
  };

  // Open modal for adding new question
  const handleAddQuestion = () => {
    setEditingQuestion(undefined);
    setIsModalOpen(true);
  };

  // Open modal for editing existing question
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  // Handle form submission (add or update)
  const handleSubmitQuestion = async (data: QuestionFormData) => {
    setLoading(true);
    try {
      if (editingQuestion) {
        // Update existing question
        await questionsApi.update(editingQuestion.id, data);
        showSuccess('Question updated successfully');
      } else {
        // Add new question
        if (!quiz) {
          throw new Error('Quiz data is not available yet');
        }

        await questionsApi.create({
          quiz: quiz.id,
          order: quiz.questions.length + 1,
          ...data,
        });
        showSuccess('Question added successfully');
      }

      setIsModalOpen(false);
      setEditingQuestion(undefined);
      onUpdate(); // Refresh course data
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  // Handle question deletion
  const handleDeleteQuestion = (question: Question) => {
    setQuestionToDelete(question);
  };

  const closeDeleteDialog = () => {
    if (confirmingDelete) {
      return;
    }
    setQuestionToDelete(null);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) {
      return;
    }

    setConfirmingDelete(true);
    setDeletingId(questionToDelete.id);

    try {
      await questionsApi.delete(questionToDelete.id);
      showSuccess('Question deleted successfully');
      onUpdate(); // Refresh course data
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete question');
    } finally {
      setConfirmingDelete(false);
      setDeletingId(null);
      setQuestionToDelete(null);
    }
  };

  if (!quiz) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8 text-gray-600 space-y-2">
            <p className="text-lg font-semibold text-gray-900">Quiz pending</p>
            <p className="text-sm">
              The quiz is still being generated. It will appear here once the AI finishes.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardBody className="p-0">
          {/* Quiz Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">Course Quiz</h3>
                  {quiz.generationStatus && (
                    <Badge
                      variant={
                        quiz.generationStatus === 'completed'
                          ? 'success'
                          : quiz.generationStatus === 'failed'
                            ? 'error'
                            : 'generating'
                      }
                    >
                      {quiz.generationStatus}
                    </Badge>
                  )}
                  {quiz.generationStatus === 'generating' && <LoadingSpinner size="sm" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="secondary" size="sm" onClick={handleAddQuestion}>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Question
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRegenerate}
                  loading={isRegenerating}
                  disabled={isRegenerating}
                >
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Regenerate Quiz
                </Button>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="divide-y divide-gray-200">
            {quiz.questions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
                <p className="text-sm font-medium">No questions in this quiz yet</p>
                <p className="text-sm mt-1">
                  Get started by adding a question or regenerating the quiz
                </p>
              </div>
            ) : (
              quiz.questions.map((question, index) => {
                const typeBadge = getQuestionTypeBadge(question.type);
                const isDeleting = deletingId === question.id;

                return (
                  <div key={question.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Question Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                            {index + 1}
                          </span>
                          <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                        </div>

                        {/* Question Text */}
                        <p className="text-base font-medium text-gray-900 mb-4 ml-11">
                          {question.text}
                        </p>

                        {/* Answers */}
                        <div className="ml-11 space-y-2">
                          {question.answers.map(answer => (
                            <div
                              key={answer.id}
                              className={`flex items-center space-x-3 p-3 rounded-md border ${
                                answer.isCorrect
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {answer.isCorrect ? (
                                <svg
                                  className="w-5 h-5 text-green-600 flex-shrink-0"
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
                              ) : (
                                <svg
                                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                              <span
                                className={`text-sm ${
                                  answer.isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {answer.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          disabled={isDeleting}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                          title="Edit question"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question)}
                          disabled={isDeleting}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete question"
                        >
                          {isDeleting ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardBody>
      </Card>

      {/* Question Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQuestion(undefined);
        }}
        title={editingQuestion ? 'Edit Question' : 'Add New Question'}
        size="lg"
      >
        <QuestionForm
          question={editingQuestion}
          onSubmit={handleSubmitQuestion}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingQuestion(undefined);
          }}
          loading={loading}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(questionToDelete)}
        title="Delete question"
        message={
          questionToDelete
            ? `Are you sure you want to delete "${questionToDelete.text}"? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete question"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={confirmingDelete}
        onConfirm={confirmDeleteQuestion}
        onCancel={closeDeleteDialog}
      />
    </>
  );
}
