import { useState, useEffect, useCallback } from 'react';
import { agentService } from '@/services/spmc/agent.service';
import { CapacityInfo, QueueStatus, AgentCharacter } from '@/services/spmc/types';

interface UseAgentCapacityReturn {
  capacity: CapacityInfo | null;
  queueStatus: QueueStatus | null;
  isLoading: boolean;
  error: string | null;
  isAtCapacity: boolean;
  availableSlots: number;
  canDeployCharacter: (character: AgentCharacter) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing agent capacity and queue status
 * Auto-refreshes every 30 seconds
 */
export function useAgentCapacity(autoRefresh: boolean = true): UseAgentCapacityReturn {
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapacity = useCallback(async () => {
    try {
      const [capacityResponse, queueResponse] = await Promise.all([
        agentService.getCapacity(),
        agentService.getQueueStatus()
      ]);

      if (capacityResponse.success && capacityResponse.data) {
        setCapacity(capacityResponse.data);
        setError(null);
      } else {
        setError(capacityResponse.error?.message || 'Failed to fetch capacity');
      }

      if (queueResponse.success && queueResponse.data) {
        setQueueStatus(queueResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCapacity();
  }, [fetchCapacity]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchCapacity, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchCapacity]);

  const isAtCapacity = capacity?.at_capacity || false;
  const availableSlots = capacity?.available_slots || 0;

  /**
   * Check if a specific character can be deployed
   * Returns false if:
   * - At capacity (5/5 agents)
   * - Character already deployed (testing restriction)
   */
  const canDeployCharacter = useCallback((character: AgentCharacter): boolean => {
    if (isAtCapacity) return false;
    if (!capacity) return true; // Assume allowed if capacity unknown

    // Check if character already deployed
    return !capacity.active_agent_characters.includes(character);
  }, [capacity, isAtCapacity]);

  return {
    capacity,
    queueStatus,
    isLoading,
    error,
    isAtCapacity,
    availableSlots,
    canDeployCharacter,
    refresh: fetchCapacity
  };
}
