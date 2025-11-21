import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import type { QuestionFormData, QuestionType, Question } from '@/types';

interface QuestionFormProps {
  question?: Question; // If provided, we're editing. Otherwise, adding new.
  onSubmit: (data: QuestionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormErrors {
  text?: string;
  answers?: string;
}

export function QuestionForm({ question, onSubmit, onCancel, loading = false }: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionFormData>({
    text: question?.text || '',
    type: question?.type || 'single_choice',
    answers: question?.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })) || [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Update form when question prop changes
  useEffect(() => {
    if (question) {
      // Defer the update to avoid synchronous setState inside effect
      Promise.resolve().then(() =>
        setFormData({
          text: question.text,
          type: question.type,
          answers: question.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
        })
      );
    }
  }, [question]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.text.trim()) {
      newErrors.text = 'Question text is required';
    }

    const nonEmptyAnswers = formData.answers.filter(a => a.text.trim());
    if (nonEmptyAnswers.length < 2) {
      newErrors.answers = 'At least 2 answers are required';
    }

    const hasCorrectAnswer = formData.answers.some(a => a.isCorrect && a.text.trim());
    if (!hasCorrectAnswer) {
      newErrors.answers = 'At least one answer must be marked as correct';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Filter out empty answers
    const cleanedData: QuestionFormData = {
      ...formData,
      answers: formData.answers.filter(a => a.text.trim()),
    };

    await onSubmit(cleanedData);
  };

  const handleAnswerChange = (
    index: number,
    field: 'text' | 'isCorrect',
    value: string | boolean
  ) => {
    setFormData(prev => {
      const newAnswers = [...prev.answers];
      if (field === 'text') {
        newAnswers[index].text = value as string;
      } else {
        // For single_choice, only one answer can be correct
        if (prev.type === 'single_choice') {
          newAnswers.forEach((a, i) => {
            a.isCorrect = i === index ? (value as boolean) : false;
          });
        } else {
          // For MCQ, multiple answers can be correct
          newAnswers[index].isCorrect = value as boolean;
        }
      }
      return { ...prev, answers: newAnswers };
    });

    // Clear errors
    if (errors.answers) {
      setErrors(prev => ({ ...prev, answers: undefined }));
    }
  };

  const addAnswer = () => {
    setFormData(prev => ({
      ...prev,
      answers: [...prev.answers, { text: '', isCorrect: false }],
    }));
  };

  const removeAnswer = (index: number) => {
    if (formData.answers.length <= 2) return; // Minimum 2 answers
    setFormData(prev => ({
      ...prev,
      answers: prev.answers.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
        <select
          value={formData.type}
          onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as QuestionType }))}
          disabled={loading || !!question} // Can't change type when editing
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="single_choice">Single Choice (one correct answer)</option>
          <option value="mcq">Multiple Choice (multiple correct answers)</option>
        </select>
        {question && (
          <p className="mt-1 text-xs text-gray-500">Question type cannot be changed when editing</p>
        )}
      </div>

      {/* Question Text */}
      <Input
        label="Question Text"
        variant="textarea"
        name="text"
        value={formData.text}
        onChange={e => {
          setFormData(prev => ({ ...prev, text: e.target.value }));
          if (errors.text) setErrors(prev => ({ ...prev, text: undefined }));
        }}
        error={errors.text}
        placeholder="Enter your question..."
        rows={3}
        disabled={loading}
        required
      />

      {/* Answers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answers{' '}
          {formData.type === 'single_choice' && (
            <span className="text-xs text-gray-500">(select one correct answer)</span>
          )}
          {formData.type === 'mcq' && (
            <span className="text-xs text-gray-500">(select all correct answers)</span>
          )}
        </label>

        <div className="space-y-3">
          {formData.answers.map((answer, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex items-center pt-2">
                <input
                  type={formData.type === 'mcq' ? 'checkbox' : 'radio'}
                  name="correctAnswer"
                  checked={answer.isCorrect}
                  onChange={e => handleAnswerChange(index, 'isCorrect', e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              <Input
                type="text"
                value={answer.text}
                onChange={e => handleAnswerChange(index, 'text', e.target.value)}
                placeholder={`Answer ${index + 1}`}
                disabled={loading}
                className="flex-1"
              />
              {formData.answers.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeAnswer(index)}
                  disabled={loading}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {errors.answers && <p className="mt-2 text-sm text-red-600">{errors.answers}</p>}

        <button
          type="button"
          onClick={addAnswer}
          disabled={loading || formData.answers.length >= 4}
          className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Answer {formData.answers.length >= 4 && <span className="ml-1 text-xs">(max 4)</span>}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={loading}>
          {question ? 'Update Question' : 'Add Question'}
        </Button>
      </div>
    </form>
  );
}
