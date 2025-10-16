'use client';

import React from 'react';
import { useAgentCapacity } from '@/hooks/useAgentCapacity';

interface AgentCapacityDisplayProps {
  variant?: 'compact' | 'detailed';
  showQueue?: boolean;
}

export function AgentCapacityDisplay({ variant = 'compact', showQueue = true }: AgentCapacityDisplayProps) {
  const { capacity, queueStatus, isLoading, error, isAtCapacity, availableSlots } = useAgentCapacity();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading capacity...</span>
      </div>
    );
  }

  if (error || !capacity) {
    return null; // Silently fail - capacity is informational
  }

  const getCapacityColor = () => {
    if (isAtCapacity) return 'bg-red-100 text-red-700 border-red-300';
    if (availableSlots === 1) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg border font-medium text-sm ${getCapacityColor()}`}>
          <span className="font-semibold">{capacity.active_agents}/{capacity.max_agents}</span> agents deployed
        </div>

        {showQueue && queueStatus?.is_deploying && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">Deployment in progress</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900">Agent Capacity</h4>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getCapacityColor()}`}>
          {capacity.active_agents}/{capacity.max_agents} deployed
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Available slots:</span>
          <span className="font-medium text-gray-900">{availableSlots}</span>
        </div>

        {capacity.active_agent_characters.length > 0 && (
          <div>
            <span className="text-gray-600 block mb-1">Active characters:</span>
            <div className="flex flex-wrap gap-1">
              {capacity.active_agent_characters.map((char) => (
                <span
                  key={char}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        )}

        {showQueue && queueStatus && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Queue status:</span>
              <span className={`font-medium ${queueStatus.is_deploying ? 'text-blue-600' : 'text-gray-900'}`}>
                {queueStatus.is_deploying ? 'Deploying' : 'Idle'}
              </span>
            </div>
            {queueStatus.is_deploying && queueStatus.current_deployment && (
              <div className="mt-1 text-xs text-gray-500">
                Agent {queueStatus.current_deployment.agent_id.slice(0, 8)}... started{' '}
                {new Date(queueStatus.current_deployment.started_at).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {isAtCapacity && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>At capacity.</strong> Select an active character to redeploy, or delete an agent to free a slot.
          </div>
        )}
      </div>
    </div>
  );
}
