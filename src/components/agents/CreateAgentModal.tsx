'use client';

import React, { useState } from 'react';
import { AgentCharacter, DeploymentTarget, TradingConfig } from '@/services/spmc/types';
import { agentService } from '@/services/spmc/agent.service';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess: (agentId: string) => void;
}

export function CreateAgentModal({ isOpen, onClose, groupId, groupName, onSuccess }: CreateAgentModalProps) {
  const [agentCharacter, setAgentCharacter] = useState<AgentCharacter>('pamela');
  const [gitTag, setGitTag] = useState('pamela-v0.1.0');
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTarget>('local');
  const [telegramBotId, setTelegramBotId] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [maxPositionSize, setMaxPositionSize] = useState(100);
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [unsupervisedMode, setUnsupervisedMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterOptions: { value: AgentCharacter; label: string; description: string }[] = [
    { value: 'pamela', label: 'Pamela', description: 'Recommended - Balanced trader' },
    { value: 'lib-out', label: 'Lib Out', description: 'Liberal bias trader' },
    { value: 'chalk-eater', label: 'Chalk Eater', description: 'Favorites trader' },
    { value: 'nothing-ever-happens', label: 'Nothing Ever Happens', description: 'Contrarian trader' },
    { value: 'trumped-up', label: 'Trumped Up', description: 'Conservative bias trader' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!telegramBotId.trim()) {
      setError('Telegram Bot ID is required');
      return;
    }

    if (maxPositionSize < 1 || maxPositionSize > 10000) {
      setError('Max position size must be between $1 and $10,000');
      return;
    }

    if (minConfidence < 0 || minConfidence > 1) {
      setError('Min confidence must be between 0.0 and 1.0');
      return;
    }

    setIsCreating(true);

    try {
      const tradingConfig: TradingConfig = {
        max_position_size: maxPositionSize,
        min_confidence_threshold: minConfidence,
        unsupervised_mode: unsupervisedMode
      };

      const response = await agentService.createAgent({
        group_id: groupId,
        agent_character: agentCharacter,
        git_tag: gitTag,
        deployment_target: deploymentTarget,
        telegram_bot_id: telegramBotId,
        telegram_chat_id: telegramChatId || undefined,
        trading_config: tradingConfig
      });

      if (response.success && response.data) {
        onSuccess(response.data.agent_id);
      } else {
        setError(response.error?.message || 'Failed to create agent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error creating agent');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

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

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Agent Character */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Agent Character *
                      </label>
                      <select
                        value={agentCharacter}
                        onChange={(e) => {
                          const char = e.target.value as AgentCharacter;
                          setAgentCharacter(char);
                          setGitTag(`${char}-v0.1.0`);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                        required
                      >
                        {characterOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Git Tag */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Git Release Tag *
                      </label>
                      <input
                        type="text"
                        value={gitTag}
                        onChange={(e) => setGitTag(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="e.g., pamela-v0.1.0"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Version tag from the trading-agents repository
                      </p>
                    </div>

                    {/* Deployment Target */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Deployment Target *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="local"
                            checked={deploymentTarget === 'local'}
                            onChange={(e) => setDeploymentTarget(e.target.value as DeploymentTarget)}
                            className="mr-2"
                          />
                          <span className="text-gray-900">Local Docker (Testing)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="tee"
                            checked={deploymentTarget === 'tee'}
                            onChange={(e) => setDeploymentTarget(e.target.value as DeploymentTarget)}
                            className="mr-2"
                          />
                          <span className="text-gray-900">Phala TEE (Production)</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Use Local for testing, TEE for production trading
                      </p>
                    </div>

                    {/* Telegram Configuration */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Telegram Configuration</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bot Token *
                          </label>
                          <input
                            type="text"
                            value={telegramBotId}
                            onChange={(e) => setTelegramBotId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="123456789:ABCdef..."
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chat ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="987654321"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Trading Configuration */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Trading Configuration</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Position Size ($) *
                          </label>
                          <input
                            type="number"
                            value={maxPositionSize}
                            onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                            min="1"
                            max="10000"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">Maximum $ per position (1-10,000)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Confidence Threshold *
                          </label>
                          <input
                            type="number"
                            value={minConfidence}
                            onChange={(e) => setMinConfidence(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                            min="0"
                            max="1"
                            step="0.1"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">Minimum confidence to trade (0.0-1.0)</p>
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={unsupervisedMode}
                              onChange={(e) => setUnsupervisedMode(e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">
                              Enable Unsupervised Mode (Auto-trade without approval)
                            </span>
                          </label>
                          <p className="ml-6 text-xs text-gray-500">
                            {unsupervisedMode ? 'Agent will trade automatically' : 'Trades require approval'}
                          </p>
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
                disabled={isCreating}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating...
                  </div>
                ) : (
                  'Create Agent'
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
