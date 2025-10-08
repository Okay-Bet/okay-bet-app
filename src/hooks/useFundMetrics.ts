import { useState, useEffect } from 'react';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';
import { FundMetrics, FundPhase } from '@/services/funds/types';

interface UseFundMetricsOptions {
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseFundMetricsReturn {
  metrics: FundMetrics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and poll fund metrics from the blockchain
 * @param fundAddress - The address of the fund contract
 * @param options - Configuration options for the hook
 */
export function useFundMetrics(
  fundAddress: string | null | undefined,
  options: UseFundMetricsOptions = {}
): UseFundMetricsReturn {
  const { 
    refreshInterval = 30000, // Default 30 seconds
    enabled = true 
  } = options;

  const [metrics, setMetrics] = useState<FundMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = async () => {
    if (!fundAddress || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const fundService = new InvestmentFundService();
      const fundMetrics = await fundService.getFundMetrics(fundAddress as `0x${string}`);
      
      setMetrics(fundMetrics);
    } catch (err) {
      console.error('Error fetching fund metrics:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up polling interval if enabled
    if (enabled && refreshInterval > 0 && fundAddress) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fundAddress, enabled, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
}

/**
 * Helper hook to get phase-specific display data
 */
export function useFundPhaseDisplay(phase: FundPhase | null) {
  const getPhaseColor = () => {
    switch (phase) {
      case FundPhase.DEPOSIT:
        return 'bg-green-100 text-green-800 border-green-200';
      case FundPhase.TRADING:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case FundPhase.REDEMPTION:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case FundPhase.COMPLETED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getPhaseName = () => {
    switch (phase) {
      case FundPhase.DEPOSIT:
        return 'ACCEPTING DEPOSITS';
      case FundPhase.TRADING:
        return 'ACTIVE TRADING';
      case FundPhase.REDEMPTION:
        return 'WITHDRAWALS OPEN';
      case FundPhase.COMPLETED:
        return 'COMPLETED';
      default:
        return 'NO FUND';
    }
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case FundPhase.DEPOSIT:
        return '💰';
      case FundPhase.TRADING:
        return '📈';
      case FundPhase.REDEMPTION:
        return '💸';
      case FundPhase.COMPLETED:
        return '✅';
      default:
        return '🏗️';
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case FundPhase.DEPOSIT:
        return 'Fund is open for investment';
      case FundPhase.TRADING:
        return 'Fund is actively trading markets';
      case FundPhase.REDEMPTION:
        return 'Investors can withdraw funds';
      case FundPhase.COMPLETED:
        return 'Fund has been closed';
      default:
        return 'No fund deployed yet';
    }
  };

  return {
    color: getPhaseColor(),
    name: getPhaseName(),
    icon: getPhaseIcon(),
    description: getPhaseDescription()
  };
}