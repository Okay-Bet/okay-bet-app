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

