import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, CardBody, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { aiApi } from '@/services/api';
import { showError, showSuccess } from '@/utils/toast';
import type { GenerationStage, GenerationStatus as StatusLabel, GenerationTask } from '@/types';

interface GenerationStatusProps {
  courseId: string;
  onComplete?: (task: GenerationTask) => void;
  onRegenerate?: () => void;
}

const stageCopy: Record<GenerationStage, string> = {
  creating: 'Drafting outline and modules',
  reviewing: 'Reviewing generated content',
  refining: 'Polishing lessons and quizzes',
  completed: 'Course generation finished',
};

const statusVariantMap: Record<StatusLabel, 'generating' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  running: 'generating',
  completed: 'success',
  failed: 'error',
};

export function GenerationStatus({ courseId, onComplete, onRegenerate }: GenerationStatusProps) {
  const { token } = useAuth();
  const completionNotifiedRef = useRef(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [wsEnabled, setWsEnabled] = useState(true);

  const { latestMessage, status, reconnecting, error, reconnectAttempts } =
    useWebSocket<GenerationTask>({
      courseId,
      token,
      enabled: wsEnabled && Boolean(courseId && token),
      retryLimit: -1,
      onClose: event => {
        if (event.code === 4404) {
          console.warn('No generation task found for course yet. Will retry when available.');
        }
      },
    });

  const progress = latestMessage?.progress ?? 0;
  const stage = latestMessage?.currentStage ?? 'creating';
  const statusLabel = latestMessage?.status ?? 'running';
  const message = latestMessage?.message ?? 'Our AI is preparing your course content.';
  const errorMessage = latestMessage?.errorMessage;

  useEffect(() => {
    if (!latestMessage || latestMessage.status !== 'completed') {
      return;
    }

    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onComplete?.(latestMessage);
    }
  }, [latestMessage, onComplete]);

  useEffect(() => {
    if (status === 'open') {
      completionNotifiedRef.current = false;
    }
  }, [status]);

  const stageDescription = useMemo(
    () => stageCopy[stage as GenerationStage] ?? stageCopy.creating,
    [stage]
  );

  // Handle course regeneration
  const handleRegenerateCourse = async () => {
    if (!courseId || isRegenerating) return;

    if (!confirm('Are you sure you want to regenerate the entire course? This will replace all existing content.')) {
      return;
    }

    setIsRegenerating(true);

    try {
      // Disconnect WebSocket before regeneration
      setWsEnabled(false);

      // Start course regeneration
      await aiApi.generateCourse(courseId);
      showSuccess('Course regeneration started! You can monitor the progress below.');

      // Refresh course data
      onRegenerate?.();

      // Small delay to ensure backend has created the new task
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reconnect WebSocket to pick up the new generation task
      setWsEnabled(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to start course regeneration');
      // Re-enable WebSocket even on error
      setWsEnabled(true);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center space-x-3 text-yellow-700">
            <Badge variant="warning">Auth required</Badge>
            <p className="text-sm">Log in again to resume real-time generation updates.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show error state if generation failed
  if (statusLabel === 'failed') {
    return (
      <Card>
        <CardBody>
          <div className="flex items-start space-x-4">
            <div className="mt-1">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <p className="font-semibold text-red-900">Generation failed</p>
                <Badge variant="error">failed</Badge>
              </div>
              <p className="mt-1 text-sm text-red-700">{message}</p>
              {errorMessage && (
                <div className="mt-3 rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-xs font-medium text-red-800 mb-1">Error details:</p>
                  <p className="text-xs text-red-700 font-mono whitespace-pre-wrap break-words">
                    {errorMessage}
                  </p>
                </div>
              )}
              <div className="mt-4 flex items-center space-x-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRegenerateCourse}
                  loading={isRegenerating}
                  disabled={isRegenerating}
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
                <p className="text-sm text-gray-600">
                  or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show completed state
  if (statusLabel === 'completed') {
    return (
      <Card>
        <CardBody>
          <div className="flex items-start space-x-4">
            <div className="mt-1">
              <svg
                className="h-6 w-6 text-green-600"
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
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <p className="font-semibold text-green-900">Generation complete!</p>
                <Badge variant="success">completed</Badge>
              </div>
              <p className="mt-1 text-sm text-green-700">
                Your course has been successfully generated and is ready to review.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show in-progress state
  return (
    <Card>
      <CardBody>
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <LoadingSpinner size="md" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <p className="font-semibold text-gray-900">Course generation in progress</p>
              <Badge variant={statusVariantMap[statusLabel]}>{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{stageDescription}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
            </div>
            {(reconnecting || error) && (
              <div className="mt-3 text-xs text-gray-500">
                {reconnecting && <p>Reconnecting to updates… (attempt {reconnectAttempts})</p>}
                {error && <p className="text-red-600">{error}</p>}
              </div>
            )}
            {status === 'closed' && !reconnecting && !latestMessage && (
              <p className="mt-3 text-xs text-gray-400">
                Waiting for the generation task to start…
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
