'use client';

import React, { useState } from 'react';
import { AgentCharacter, DeploymentTarget } from '@/services/spmc/types';
import { agentService } from '@/services/spmc/agent.service';
import { useAgentCapacity } from '@/hooks/useAgentCapacity';
import { AgentCapacityDisplay } from './AgentCapacityDisplay';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess: (agentId: string) => void;
  onDeploymentStarted?: () => void;
}

// Agent metadata - simplified to just what user needs to know
const AGENT_CONFIGS: Record<AgentCharacter, {
  label: string;
  description: string;
  strategy: string;
  defaultGitTag: string;
}> = {
  'pamela': {
    label: 'Pamela',
    description: 'Balanced AI trader with custom decision-making',
    strategy: 'Custom AI Model',
    defaultGitTag: 'pamela-v0.3.0'
  },
  'lib-out': {
    label: 'Lib Out',
    description: 'Follows market index with liberal bias',
    strategy: 'Index Following',
    defaultGitTag: 'lib-out-v0.2.0'
  },
  'chalk-eater': {
    label: 'Chalk Eater',
    description: 'AI trader favoring high-probability outcomes',
    strategy: 'Custom AI Model',
    defaultGitTag: 'chalk-eater-v0.2.0'
  },
  'nothing-ever-happens': {
    label: 'Nothing Ever Happens',
    description: 'Contrarian index follower',
    strategy: 'Index Following',
    defaultGitTag: 'nothing-ever-happens-v0.2.0'
  },
  'trumped-up': {
    label: 'Trumped Up',
    description: 'Conservative-leaning index follower',
    strategy: 'Index Following',
    defaultGitTag: 'trumped-up-v0.2.0'
  }
};

export function CreateAgentModal({ isOpen, onClose, groupId, groupName, onSuccess, onDeploymentStarted }: CreateAgentModalProps) {
  const { canDeployCharacter, isAtCapacity, capacity } = useAgentCapacity();

  const [agentCharacter, setAgentCharacter] = useState<AgentCharacter>('pamela');
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTarget>('local');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [deployedAgentId, setDeployedAgentId] = useState<string | null>(null);
  const [showRedeployConfirm, setShowRedeployConfirm] = useState(false);
  const [existingAgentId, setExistingAgentId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate character config exists
    const characterConfig = AGENT_CONFIGS[agentCharacter];
    if (!characterConfig) {
      setError(`Invalid agent character: ${agentCharacter}`);
      return;
    }

    // Capacity validation - only block if at capacity AND trying to deploy a NEW agent
    // If character is already deployed (!canDeployCharacter), we'll try to create anyway
    // and let the server error tell us the agent ID for redeployment
    if (isAtCapacity && canDeployCharacter(agentCharacter)) {
      setError('Cannot deploy new agent: At maximum capacity (5/5 agents). Please select an already-deployed character to redeploy, or delete an agent first.');
      return;
    }

    setIsCreating(true);

    try {
      // Create agent with minimal required fields
      // Server handles telegram config, LLM API keys, and trading strategy defaults
      const createResponse = await agentService.createAgent({
        group_id: groupId,
        agent_character: agentCharacter,
        git_tag: characterConfig.defaultGitTag,
        deployment_target: deploymentTarget,
        // Server will use defaults for telegram_bot_id, trading_config, etc.
        telegram_bot_id: '', // Server assigns
        trading_config: {
          trading_strategy: characterConfig.strategy === 'Index Following' ? 'spmc_index' : 'custom_model',
          // Server will fill in strategy-specific defaults
          ...(characterConfig.strategy === 'Index Following' ? {
            spmc_index_id: groupId, // Use current group as index
            index_rebalance_day: 'MONDAY',
            index_rebalance_hour: 9
          } : {
            max_position_size: 100,
            min_confidence_threshold: 0.7,
            unsupervised_mode: false
          })
        }
      });

      if (!createResponse.success || !createResponse.data) {
        // Check if error is about character already deployed
        const errorMsg = createResponse.error?.message || 'Failed to create agent';
        const agentIdMatch = errorMsg.match(/agent_id:\s*([a-f0-9-]+)/i);

        if (agentIdMatch && errorMsg.includes('already deployed')) {
          // Extract agent ID from error and show confirmation
          setExistingAgentId(agentIdMatch[1]);
          setShowRedeployConfirm(true);
          setIsCreating(false);
          return;
        }

        setError(errorMsg);
        setIsCreating(false);
        return;
      }

      const agentId = createResponse.data.agent_id;

      // Trigger deployment
      const deployResponse = await agentService.deployAgent(agentId);

      if (!deployResponse.success) {
        setError(`Failed to trigger deployment: ${deployResponse.error?.message}`);
        setIsCreating(false);
        return;
      }

      // Success - deployment is now running in background
      setDeployedAgentId(agentId);
      setShowSuccessMessage(true);

      // Notify parent if callback provided
      if (onDeploymentStarted) {
        onDeploymentStarted();
      }

      // Also call onSuccess for compatibility
      onSuccess(agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error creating agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRedeployConfirm = async () => {
    if (!existingAgentId) return;

    // Validate character config exists
    const characterConfig = AGENT_CONFIGS[agentCharacter];
    if (!characterConfig) {
      setError(`Invalid agent character: ${agentCharacter}`);
      return;
    }

    setShowRedeployConfirm(false);
    setIsCreating(true);
    setError(null);

    try {
      // First, delete the existing agent
      const deleteResponse = await agentService.deleteAgent(existingAgentId, true);

      if (!deleteResponse.success) {
        setError(`Failed to delete existing agent: ${deleteResponse.error?.message}`);
        setIsCreating(false);
        return;
      }

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now create and deploy the new agent
      const createResponse = await agentService.createAgent({
        group_id: groupId,
        agent_character: agentCharacter,
        git_tag: characterConfig.defaultGitTag,
        deployment_target: deploymentTarget,
        telegram_bot_id: '',
        trading_config: {
          trading_strategy: characterConfig.strategy === 'Index Following' ? 'spmc_index' : 'custom_model',
          ...(characterConfig.strategy === 'Index Following' ? {
            spmc_index_id: groupId,
            index_rebalance_day: 'MONDAY',
            index_rebalance_hour: 9
          } : {
            max_position_size: 100,
            min_confidence_threshold: 0.7,
            unsupervised_mode: false
          })
        }
      });

      if (!createResponse.success || !createResponse.data) {
        setError(createResponse.error?.message || 'Failed to create agent');
        setIsCreating(false);
        return;
      }

      const agentId = createResponse.data.agent_id;

      // Trigger deployment
      const deployResponse = await agentService.deployAgent(agentId);

      if (!deployResponse.success) {
        setError(`Failed to trigger deployment: ${deployResponse.error?.message}`);
        setIsCreating(false);
        return;
      }

      // Success
      setDeployedAgentId(agentId);
      setShowSuccessMessage(true);

      if (onDeploymentStarted) {
        onDeploymentStarted();
      }

      onSuccess(agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during redeployment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRedeployCancel = () => {
    setShowRedeployConfirm(false);
    setExistingAgentId(null);
  };

  const handleCloseSuccessMessage = () => {
    setShowSuccessMessage(false);
    setDeployedAgentId(null);
    onClose();
  };

  if (!isOpen) return null;

  // Show redeploy confirmation dialog
  if (showRedeployConfirm) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={handleRedeployCancel}
          />

          {/* Modal panel */}
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-bold text-gray-900">
                    Agent Already Deployed
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      The <strong>{AGENT_CONFIGS[agentCharacter]?.label || agentCharacter}</strong> agent is already deployed.
                    </p>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-semibold mb-2">What will happen:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">1.</span>
                          <span>The existing agent will be deleted (including container and resources)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">2.</span>
                          <span>A new agent will be created and deployed for &quot;{groupName}&quot;</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">3.</span>
                          <span>Deployment will take 16-20 minutes to complete</span>
                        </li>
                      </ul>
                    </div>
                    {existingAgentId && existingAgentId !== 'unknown' && (
                      <p className="mt-2 text-xs text-gray-500">
                        Existing Agent ID: <code className="font-mono bg-gray-100 px-1 rounded">{existingAgentId}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="button"
                onClick={handleRedeployConfirm}
                disabled={isCreating}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Redeploying...
                  </div>
                ) : (
                  'Yes, Delete & Redeploy'
                )}
              </button>
              <button
                type="button"
                onClick={handleRedeployCancel}
                disabled={isCreating}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message if deployment started
  if (showSuccessMessage) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={handleCloseSuccessMessage}
          />

          {/* Modal panel */}
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Agent Deployment Started!</h3>
                <div className="mt-4 text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-semibold mb-2">What happens next:</p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Your agent is being deployed in the background</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>This will take 16-20 minutes</strong> (building Docker image, deploying container, generating wallet)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>You can close this and come back later - your deployment will continue</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Check the agent status in the group details to see progress</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Once ready, the agent wallet will appear and you can deploy a fund</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600 mb-1">Agent ID</p>
                  <p className="text-xs font-mono text-gray-900 break-all">{deployedAgentId}</p>
                </div>
                <button
                  onClick={handleCloseSuccessMessage}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  Got it - I&apos;ll check back later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="w-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Deploy Trading Agent for {groupName}
                  </h3>

                  {/* Capacity Display */}
                  <div className="mb-4">
                    <AgentCapacityDisplay variant="compact" showQueue={true} />
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Agent Character Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Select Agent Character
                      </label>
                      <div className="space-y-2">
                        {Object.entries(AGENT_CONFIGS).map(([char, config]) => {
                          const canDeploy = canDeployCharacter(char as AgentCharacter);
                          const isSelected = agentCharacter === char;

                          return (
                            <label
                              key={char}
                              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : !canDeploy
                                  ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400'
                                  : 'border-gray-200 hover:border-primary/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="agent"
                                value={char}
                                checked={isSelected}
                                onChange={(e) => setAgentCharacter(e.target.value as AgentCharacter)}
                                disabled={isCreating}
                                className="mt-1 mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-900">{config.label}</span>
                                  <div className="flex items-center gap-1">
                                    {!canDeploy && (
                                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                                        Active
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      config.strategy === 'Index Following'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {config.strategy}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">{config.description}</p>
                                {!canDeploy && (
                                  <p className="text-xs text-yellow-700 mt-1 font-medium">
                                    ⚠️ Already deployed - selecting this will delete and redeploy
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Agent will trade on the &quot;{groupName}&quot; group using its pre-configured strategy
                      </p>
                    </div>

                    {/* Deployment Target */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Deployment Environment
                      </label>
                      <div className="space-y-2">
                        <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition ${
                          deploymentTarget === 'local'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}>
                          <input
                            type="radio"
                            value="local"
                            checked={deploymentTarget === 'local'}
                            onChange={(e) => setDeploymentTarget(e.target.value as DeploymentTarget)}
                            disabled={isCreating}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <span className="font-medium text-gray-900">Local Docker (Testing)</span>
                            <p className="text-sm text-gray-600 mt-0.5">Deploy to orchestrator server for development and testing</p>
                          </div>
                        </label>
                        <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition ${
                          deploymentTarget === 'tee'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}>
                          <input
                            type="radio"
                            value="tee"
                            checked={deploymentTarget === 'tee'}
                            onChange={(e) => setDeploymentTarget(e.target.value as DeploymentTarget)}
                            disabled={isCreating}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <span className="font-medium text-gray-900">Phala TEE (Production)</span>
                            <p className="text-sm text-gray-600 mt-0.5">Deploy to secure Trusted Execution Environment for live trading</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Agent Configuration</p>
                          <ul className="space-y-1 text-blue-800">
                            <li>• Telegram notifications, API keys, and trading parameters are pre-configured on the server</li>
                            <li>• {AGENT_CONFIGS[agentCharacter]?.strategy === 'Index Following'
                              ? 'This agent will automatically rebalance to match the group\'s market allocation'
                              : 'This agent will use AI to make trading decisions based on market analysis'}</li>
                            <li>• Deployment takes 16-20 minutes to complete</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="submit"
                disabled={isCreating || (isAtCapacity && canDeployCharacter(agentCharacter))}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Deploying...
                  </div>
                ) : !canDeployCharacter(agentCharacter) ? (
                  'Redeploy Agent'
                ) : (
                  'Deploy Agent'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
