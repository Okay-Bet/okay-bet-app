'use client';

import React, { useState, useEffect } from 'react';
import { DeploymentStatus, DeploymentTarget } from '@/services/spmc/types';
import { agentService } from '@/services/spmc/agent.service';

interface AgentStatusCardProps {
  agentId: string;
  groupId: string;
  onRefresh?: () => void;
}

const statusColors: Record<DeploymentStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  cloning: 'bg-blue-100 text-blue-700',
  building: 'bg-yellow-100 text-yellow-700',
  deploying: 'bg-orange-100 text-orange-700',
  deployed: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
};

const statusLabels: Record<DeploymentStatus, string> = {
  pending: 'Pending',
  cloning: 'Cloning',
  building: 'Building',
  deploying: 'Deploying',
  deployed: 'Starting',
  ready: 'Ready',
  failed: 'Failed'
};

export function AgentStatusCard({ agentId, groupId, onRefresh }: AgentStatusCardProps) {
  const [status, setStatus] = useState<DeploymentStatus>('pending');
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTarget>('local');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  const [memoryPercent, setMemoryPercent] = useState<number | null>(null);
  const [containerStatus, setContainerStatus] = useState<string | null>(null);
  const [deployedAt, setDeployedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [isRestarting, setIsRestarting] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await agentService.getContainerStatus(agentId);

      if (response.success && response.data) {
        setStatus(response.data.deployment_status);
        setDeploymentTarget(response.data.deployment_target);
        setEndpoint(response.data.endpoint);
        setDeployedAt(response.data.deployed_at);

        if (response.data.container_stats) {
          setMemoryUsage(response.data.container_stats.memory_usage_mb);
          setMemoryPercent(response.data.container_stats.memory_percent);
          setContainerStatus(response.data.container_stats.status);
        }

        // Try to get wallet address from deployment status
        const deployStatus = await agentService.getDeploymentStatus(agentId);
        if (deployStatus.success && deployStatus.data) {
          // Note: wallet_address is not in the deployment status response
          // We'll need to get it from the full agent object if needed
        }
      } else {
        setError(response.error?.message || 'Failed to load agent status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await agentService.getAgentLogs(agentId, 100);
      if (response.success && response.data) {
        setLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleRestart = async () => {
    if (deploymentTarget !== 'local') {
      alert('Restart is only available for local deployments');
      return;
    }

    if (!confirm('Are you sure you want to restart this agent?')) {
      return;
    }

    setIsRestarting(true);
    try {
      const response = await agentService.restartAgent(agentId);
      if (response.success) {
        alert('Agent restarted successfully');
        fetchStatus();
        onRefresh?.();
      } else {
        alert(`Failed to restart: ${response.error?.message}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleRedeploy = async () => {
    if (deploymentTarget !== 'local') {
      alert('Redeploy is only available for local deployments');
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to redeploy this agent?\n\n' +
      'This will:\n' +
      '1. Delete the current agent and container\n' +
      '2. Allow you to create a new agent with updated configuration\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsRestarting(true);
    try {
      const response = await agentService.redeployAgent(agentId);
      if (response.success) {
        alert('Agent deleted successfully. The page will refresh so you can create a new agent.');
        onRefresh?.();
      } else {
        alert(`Failed to redeploy: ${response.error?.message}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRestarting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogs]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-red-200">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-1">Trading Agent</h4>
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>
        <button
          onClick={fetchStatus}
          className="p-1 text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Deployment:</span>
          <span className="font-medium text-gray-900">
            {deploymentTarget === 'local' ? 'Local Docker' : 'Phala TEE'}
          </span>
        </div>

        {endpoint && (
          <div className="flex justify-between">
            <span className="text-gray-600">Endpoint:</span>
            <span className="font-mono text-gray-900 text-xs">{endpoint}</span>
          </div>
        )}

        {deployedAt && (
          <div className="flex justify-between">
            <span className="text-gray-600">Deployed:</span>
            <span className="font-medium text-gray-900">
              {new Date(deployedAt).toLocaleString()}
            </span>
          </div>
        )}

        {deploymentTarget === 'local' && containerStatus && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Container:</span>
              <span className={`font-medium ${
                containerStatus === 'running' ? 'text-green-600' : 'text-orange-600'
              }`}>
                {containerStatus}
              </span>
            </div>

            {memoryUsage !== null && memoryPercent !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Memory:</span>
                <span className="font-medium text-gray-900">
                  {memoryUsage.toFixed(1)}MB ({memoryPercent.toFixed(1)}%)
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      {deploymentTarget === 'local' && status === 'ready' && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition font-medium"
            >
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </button>
            <button
              onClick={handleRestart}
              disabled={isRestarting}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition font-medium disabled:opacity-50"
            >
              {isRestarting ? 'Restarting...' : 'Restart'}
            </button>
          </div>
          <button
            onClick={handleRedeploy}
            disabled={isRestarting}
            className="w-full px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition font-medium disabled:opacity-50 border border-orange-300"
          >
            {isRestarting ? 'Processing...' : 'Redeploy Agent (Delete & Recreate)'}
          </button>
        </div>
      )}

      {/* Show redeploy button for failed agents too */}
      {deploymentTarget === 'local' && status === 'failed' && (
        <div className="mt-4">
          <button
            onClick={handleRedeploy}
            disabled={isRestarting}
            className="w-full px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition font-medium disabled:opacity-50 border border-red-300"
          >
            {isRestarting ? 'Processing...' : 'Redeploy Agent (Clean Up & Retry)'}
          </button>
        </div>
      )}

      {/* Logs Display */}
      {showLogs && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-700">Container Logs</h5>
            <button
              onClick={fetchLogs}
              className="text-xs text-primary hover:text-primary/80"
            >
              Refresh
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-60 overflow-y-auto font-mono">
            {logs || 'No logs available'}
          </pre>
        </div>
      )}
    </div>
  );
}
