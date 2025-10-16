'use client';

import React, { useState, useEffect } from 'react';
import { DeploymentStatus } from '@/services/spmc/types';
import { agentService } from '@/services/spmc/agent.service';

interface AgentDeploymentProgressProps {
  agentId: string;
  onComplete: () => void;
  onError: (error: string) => void;
  onRetry?: () => void;
}

const deploymentStages: DeploymentStatus[] = ['pending', 'queued', 'cloning', 'building', 'deploying', 'deployed', 'ready'];

const stageLabels: Record<DeploymentStatus, string> = {
  pending: 'Initializing...',
  queued: 'Queued for deployment...',
  cloning: 'Cloning repository...',
  building: 'Building Docker image...',
  deploying: 'Deploying container...',
  deployed: 'Waiting for agent startup...',
  ready: 'Agent ready!',
  failed: 'Deployment failed'
};

const stageIcons: Record<DeploymentStatus, string> = {
  pending: '⏳',
  queued: '📋',
  cloning: '📦',
  building: '🔨',
  deploying: '🚀',
  deployed: '⏱️',
  ready: '✅',
  failed: '❌'
};

export function AgentDeploymentProgress({ agentId, onComplete, onError, onRetry }: AgentDeploymentProgressProps) {
  const [currentStatus, setCurrentStatus] = useState<DeploymentStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeInterval: NodeJS.Timeout;
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;

    const checkStatus = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const statusPromise = agentService.getDeploymentStatus(agentId);
        const response = await Promise.race([
          statusPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - orchestrator not responding')), 10000)
          )
        ]).finally(() => clearTimeout(timeoutId));

        if (response.success && response.data) {
          consecutiveFailures = 0; // Reset failure counter on success
          const status = response.data.deployment_status;
          setCurrentStatus(status);

          if (status === 'failed') {
            const error = response.data.error_message || 'Deployment failed';
            setErrorMessage(error);
            onError(error);
            clearInterval(interval);
            clearInterval(timeInterval);
          } else if (status === 'ready') {
            clearInterval(interval);
            clearInterval(timeInterval);
            setTimeout(() => onComplete(), 1000); // Give user a moment to see success
          }
        } else {
          throw new Error(response.error?.message || 'Failed to check status');
        }
      } catch (err) {
        consecutiveFailures++;
        console.error(`Status check failed (${consecutiveFailures}/${MAX_FAILURES}):`, err);

        // Only fail if we've had multiple consecutive failures
        if (consecutiveFailures >= MAX_FAILURES) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          const detailedError = `Unable to check deployment status after ${MAX_FAILURES} attempts. The orchestrator may be experiencing issues.\n\nError: ${error}\n\nThe deployment may still be running in the background. Please check with support or try the "Try Again" button to clean up and restart.`;
          setErrorMessage(detailedError);
          setCurrentStatus('failed');
          onError(detailedError);
          clearInterval(interval);
          clearInterval(timeInterval);
        }
        // Otherwise, just log and continue polling
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    interval = setInterval(checkStatus, 5000);

    // Update elapsed time every second
    timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [agentId, onComplete, onError]);

  const getCurrentStageIndex = () => {
    return deploymentStages.indexOf(currentStatus);
  };

  const getProgressPercentage = () => {
    const index = getCurrentStageIndex();
    if (index === -1) return 0;
    return ((index + 1) / deploymentStages.length) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {currentStatus === 'failed' ? 'Deployment Failed' : 'Deploying Agent'}
              </h3>

              {errorMessage ? (
                <div className="mb-6">
                  <div className="text-6xl mb-4">{stageIcons.failed}</div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-lg mx-auto">
                    <p className="text-red-900 text-sm font-semibold mb-2">Deployment Failed</p>
                    <p className="text-red-700 text-xs whitespace-pre-line">{errorMessage}</p>
                  </div>
                  {onRetry && (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={async () => {
                          setIsRetrying(true);
                          const response = await agentService.redeployAgent(agentId);
                          if (response.success) {
                            setIsRetrying(false);
                            onRetry();
                          } else {
                            setIsRetrying(false);
                            alert(`Failed to prepare redeploy: ${response.error?.message}`);
                          }
                        }}
                        disabled={isRetrying}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {isRetrying ? 'Preparing...' : 'Try Again'}
                      </button>
                      <button
                        onClick={() => onError(errorMessage)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Current Stage Display */}
                  <div className="mb-6">
                    <div className="text-6xl mb-4 animate-pulse">{stageIcons[currentStatus]}</div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      {stageLabels[currentStatus]}
                    </p>
                    <p className="text-sm text-gray-600">
                      Elapsed time: {formatTime(elapsedTime)}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {Math.round(getProgressPercentage())}% complete
                    </div>
                  </div>

                  {/* Stage List */}
                  <div className="space-y-2 text-left">
                    {deploymentStages.map((stage, index) => {
                      const currentIndex = getCurrentStageIndex();
                      const isCompleted = index < currentIndex;
                      const isCurrent = index === currentIndex;
                      const isPending = index > currentIndex;

                      return (
                        <div
                          key={stage}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                            isCurrent ? 'bg-blue-50 border border-blue-200' :
                            isCompleted ? 'bg-green-50' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                            'bg-gray-300 text-gray-600'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <span className={`text-sm ${
                            isCurrent ? 'font-semibold text-gray-900' :
                            isCompleted ? 'text-gray-700' :
                            'text-gray-500'
                          }`}>
                            {stageLabels[stage]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Estimated Time */}
                  <div className="mt-4 text-xs text-gray-500">
                    Estimated total time: 16-20 minutes
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
