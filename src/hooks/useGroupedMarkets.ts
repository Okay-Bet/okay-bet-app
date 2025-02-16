// hooks/useGroupedMarkets.ts
import { useState, useEffect } from 'react';
import type { GroupedMarketCard } from '@/components/types';

interface UseGroupedMarketsReturn {
  groupedMarkets: GroupedMarketCard[];
  loading: boolean;
  error: string | null;
}

export function useGroupedMarkets(): UseGroupedMarketsReturn {
  const [groupedMarkets, setGroupedMarkets] = useState<GroupedMarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupedMarkets = async () => {
      try {
        const response = await fetch('/api/grouped-markets');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch grouped markets');
        }

        setGroupedMarkets(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupedMarkets();
  }, []);

  return { groupedMarkets, loading, error };
}