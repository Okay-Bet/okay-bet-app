import { useState, useEffect } from 'react';
import { Platform } from '@/services/spmc/types';

export interface IndexPriceData {
  groupId: string;
  groupTitle: string;
  currentPrice: number | null;
  markets: Array<{
    id: string;
    platform: Platform;
    weight: number;
    outcome?: 'yes' | 'no' | 'both';
    currentPrice: number | null;
    bid?: number | null;
    ask?: number | null;
    last?: number | null;
    mid?: number | null;
  }>;
  validMarketsCount: number;
  totalMarketsCount: number;
  totalWeight: number;
  timestamp: string;
  warning?: string;
  error?: string;
}

/**
 * Hook to fetch current index price for a group
 * Uses SPMC batch pricing API to support all platforms (Polymarket, Kalshi, Limitless)
 */
export function useIndexPrice(groupId: string | null) {
  const [data, setData] = useState<IndexPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setData(null);
      return;
    }

    const fetchIndexPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ groupId });
        const response = await fetch(`/api/index-prices?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch index price');
        }

        const priceData = await response.json();
        setData(priceData);
      } catch (err) {
        console.error('Error fetching index price:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIndexPrice();
  }, [groupId]);

  return { data, loading, error };
}

// Keep legacy hook name for backwards compatibility
export function useIndexPriceHistory(
  groupId: string | null,
  interval?: string,
  days?: number
) {
  return useIndexPrice(groupId);
}

/**
 * Aggregated index price data (average across all active indexes)
 */
export interface AggregatedIndexPriceData {
  averagePrice: number | null;
  indexes: Array<{
    groupId: string;
    title: string;
    price: number;
    marketCount: number;
  }>;
  count: number;
  totalIndexes?: number;
  timestamp: string;
  message?: string;
  error?: string;
}

/**
 * Hook to fetch aggregated price across all active index funds
 * Uses the same /api/index-prices endpoint without groupId parameter
 */
export function useAggregatedIndexPrice(refreshInterval: number = 60000) {
  const [data, setData] = useState<AggregatedIndexPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAggregatedPrice = async () => {
      try {
        // Call endpoint without groupId to get aggregated data
        const response = await fetch('/api/index-prices');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch aggregated index price');
        }

        const priceData = await response.json();
        setData(priceData);
        setError(null);
      } catch (err) {
        console.error('Error fetching aggregated index price:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAggregatedPrice();

    // Set up auto-refresh
    const intervalId = setInterval(fetchAggregatedPrice, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  return { data, loading, error };
}

