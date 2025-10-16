'use client';

import React, { useState, useEffect } from 'react';
import { AgentWithGroup, AgentCharacter, DeploymentStatus } from '@/services/spmc/types';

interface AgentSelectorProps {
  selectedAgentId: string | null;
  onSelect: (agentId: string | null, walletAddress: string | null) => void;
  excludeGroupId?: string;
  showManualInput?: boolean;
}

const characterLabels: Record<AgentCharacter, string> = {
  'pamela': 'Pamela',
  'lib-out': 'Lib Out',
  'chalk-eater': 'Chalk Eater',
  'nothing-ever-happens': 'Nothing Ever Happens',
  'trumped-up': 'Trumped Up'
};

const statusColors: Record<DeploymentStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  queued: 'bg-gray-100 text-gray-600',
  cloning: 'bg-blue-100 text-blue-600',
  building: 'bg-yellow-100 text-yellow-600',
  deploying: 'bg-orange-100 text-orange-600',
  deployed: 'bg-purple-100 text-purple-600',
  ready: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600'
};

export function AgentSelector({
  selectedAgentId,
  onSelect,
  excludeGroupId,
  showManualInput = true
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeGroupId]);

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load agents');
      }

      let filteredAgents = data.agents || [];

      // Filter out agents from excluded group
      if (excludeGroupId) {
        filteredAgents = filteredAgents.filter(
          (agent: AgentWithGroup) => agent.group_id !== excludeGroupId
        );
      }

      // Only show agents that are ready and have wallet addresses
      const readyAgents = filteredAgents.filter(
        (agent: AgentWithGroup) =>
          agent.deployment_status === 'ready' &&
          agent.wallet_address
      );

      setAgents(readyAgents);
    } catch (err: any) {
      console.error('Error loading agents:', err);
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'manual') {
      onSelect(null, null);
      return;
    }

    if (value === '') {
      onSelect(null, null);
      return;
    }

    const selectedAgent = agents.find(a => a.agent_id === value);
    if (selectedAgent) {
      onSelect(selectedAgent.agent_id, selectedAgent.wallet_address);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <svg className="animate-spin h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm text-gray-600">Loading agents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 border border-red-300 rounded-md bg-red-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <select
        value={selectedAgentId || ''}
        onChange={handleSelectChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select an agent...</option>
        {showManualInput && (
          <option value="manual">Manual wallet input</option>
        )}
        {agents.length === 0 && (
          <option value="" disabled>No agents available</option>
        )}
        {agents.map((agent) => (
          <option key={agent.agent_id} value={agent.agent_id}>
            {characterLabels[agent.agent_character]} - {agent.group_title || 'Unknown Group'}
            {agent.wallet_address && ` (${agent.wallet_address.slice(0, 6)}...${agent.wallet_address.slice(-4)})`}
          </option>
        ))}
      </select>

      {/* Show selected agent details */}
      {selectedAgentId && agents.length > 0 && (
        <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          {(() => {
            const selectedAgent = agents.find(a => a.agent_id === selectedAgentId);
            if (!selectedAgent) return null;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-green-900">
                      {characterLabels[selectedAgent.agent_character]}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[selectedAgent.deployment_status]}`}>
                    {selectedAgent.deployment_status}
                  </span>
                </div>
                <div className="text-sm text-green-800">
                  <div className="flex justify-between">
                    <span className="text-green-700">Group:</span>
                    <span className="font-medium">{selectedAgent.group_title}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-green-700">Wallet:</span>
                    <span className="font-mono text-xs">
                      {selectedAgent.wallet_address?.slice(0, 10)}...{selectedAgent.wallet_address?.slice(-8)}
                    </span>
                  </div>
                  {selectedAgent.trading_config && (
                    <div className="flex justify-between mt-1">
                      <span className="text-green-700">Strategy:</span>
                      <span className="font-medium">
                        {selectedAgent.trading_config.trading_strategy === 'custom_model' ? 'Custom AI' : 'Index Following'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Info message when no agents */}
      {agents.length === 0 && !loading && !error && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">No agents available</p>
              <p className="text-xs text-blue-700 mt-1">
                Deploy an agent from a group first, or enter a wallet address manually.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
