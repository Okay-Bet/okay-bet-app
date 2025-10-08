/**
 * Hook for fetching market data from SPMC
 */

import { useState, useEffect } from 'react';
import { spmcClient } from '@/services/spmc';
import {
  SPMCMarketsRequest,
  SPMCMarket,
  SPMCSearchRequest,
  SPMCHistoryDataPoint,
  Platform
} from '@/services/spmc/types';
import { transformMarketData } from '@/services/spmc/transformers';
import { SPMCGroupMarket } from '@/services/spmc/types';

interface UseSPMCMarketsOptions extends SPMCMarketsRequest {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useSPMCMarkets(options: UseSPMCMarketsOptions = {}) {
  const [markets, setMarkets] = useState<SPMCMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { autoFetch = true, refreshInterval, ...requestOptions } = options;

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await spmcClient.listMarkets(requestOptions);
      
      if (response.success && response.data) {
        setMarkets(response.data.markets);
        setHasMore(response.data.pagination.hasMore);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch markets');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching SPMC markets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    const newOffset = (requestOptions.offset || 0) + (requestOptions.limit || 10);
    const response = await spmcClient.listMarkets({
      ...requestOptions,
      offset: newOffset,
    });
    
    if (response.success && response.data) {
      setMarkets(prev => [...prev, ...response.data.markets]);
      setHasMore(response.data.pagination.hasMore);
    }
  };

  const refresh = () => {
    fetchMarkets();
  };

  useEffect(() => {
    if (autoFetch) {
      fetchMarkets();
    }

    if (refreshInterval) {
      const interval = setInterval(fetchMarkets, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [JSON.stringify(requestOptions), autoFetch, refreshInterval]);

  return {
    markets,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    fetchMarkets,
  };
}

/**
 * Hook for searching markets on SPMC
 */
export function useSPMCSearch(query: string, options?: Omit<SPMCSearchRequest, 'query'>) {
  const [results, setResults] = useState<SPMCMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async () => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await spmcClient.searchMarkets({
        query,
        ...options,
      });

      if (response.success && response.data) {
        setResults(response.data.results || []);
      } else {
        throw new Error(response.error?.message || 'Search failed');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error searching SPMC markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, JSON.stringify(options)]);

  return {
    results,
    loading,
    error,
    search,
  };
}

/**
 * Hook for fetching market prices from SPMC
 */
export function useSPMCPrices(marketIds: string[], platforms?: Platform[]) {
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = async () => {
    if (!marketIds.length) return;

    setLoading(true);
    setError(null);

    try {
      const response = await spmcClient.getMarketPrices({
        marketIds,
        platforms,
      });

      if (response.success && response.data) {
        setPrices(response.data.prices);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch prices');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching SPMC prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    // Set up polling for real-time prices
    const interval = setInterval(fetchPrices, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [JSON.stringify(marketIds), JSON.stringify(platforms)]);

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
  };
}

/**
 * Hook for getting a single market from SPMC
 */
export function useSPMCMarket(marketId: string, platform?: Platform) {
  const [market, setMarket] = useState<SPMCMarket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarket = async () => {
    if (!marketId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await spmcClient.getMarket(marketId, platform);

      if (response.success && response.data) {
        setMarket(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch market');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching SPMC market:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
  }, [marketId, platform]);

  // Transform to platform-specific format if needed
  const transformedMarket = market ? transformMarketData(market) : null;

  return {
    market,
    transformedMarket,
    loading,
    error,
    refresh: fetchMarket,
  };
}

/**
 * Hook for fetching index price history from SPMC
 * Aggregates historical data for all markets in an index
 */
export function useIndexPriceHistory(
  markets: SPMCGroupMarket[],
  interval: '1h' | '6h' | '1d' | '1w' | 'max' = '1d',
  groupTitle?: string
) {
  const [history, setHistory] = useState<SPMCHistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = async () => {
    if (!markets || markets.length === 0) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch history for all markets in parallel using API proxy to avoid CORS
      const historyResults = await Promise.allSettled(
        markets.map(async market => {
          const params = new URLSearchParams({
            interval,
            fidelity: '60' // 1 hour resolution
          });
          const response = await fetch(`/api/markets/${market.market_id}/history?${params}`);

          if (!response.ok) {
            throw new Error(`Failed to fetch history for market ${market.market_id}`);
          }

          const data = await response.json();
          return {
            success: true,
            data
          };
        })
      );

      // Count successful responses
      const successfulCount = historyResults.filter(
        r => r.status === 'fulfilled' && r.value.success && r.value.data
      ).length;

      if (successfulCount === 0) {
        throw new Error('No historical data available');
      }

      // Calculate total weight for normalization
      const totalWeight = markets.reduce((sum, m) => sum + (m.weight || 1), 0);

      // Aggregate histories into a single weighted index history
      // First, collect all market histories with their metadata
      const marketHistories: Array<{
        market: SPMCGroupMarket;
        weight: number;
        outcome: string;
        history: Array<{ t: number; p: number }>;
      }> = [];

      historyResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          const market = markets[idx];
          const weight = (market.weight || 1) / totalWeight;
          const marketHistory = result.value.data.history?.history || [];
          const outcome = market.outcome?.toLowerCase() || 'yes';

          marketHistories.push({
            market,
            weight,
            outcome,
            history: marketHistory
          });
        }
      });

      // Create a map to track the last known price for each market (for forward filling)
      const lastKnownPrices = new Map<string, number>();

      // Get all unique timestamps
      const allTimestamps = new Set<number>();
      marketHistories.forEach(mh => {
        mh.history.forEach(point => allTimestamps.add(point.t));
      });

      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      // For each timestamp, calculate the weighted average using last known prices
      const aggregatedHistory = sortedTimestamps.map(timestamp => {
        let weightedSum = 0;

        marketHistories.forEach(({ market, weight, outcome, history }) => {
          // Find the price at this timestamp, or use the last known price
          const dataPoint = history.find(p => p.t === timestamp);

          if (dataPoint) {
            // Update last known price for this market
            const adjustedPrice = outcome === 'no' ? (1 - dataPoint.p) : dataPoint.p;
            lastKnownPrices.set(market.market_id, adjustedPrice);
            weightedSum += adjustedPrice * weight;
          } else if (lastKnownPrices.has(market.market_id)) {
            // Use last known price (forward fill)
            weightedSum += lastKnownPrices.get(market.market_id)! * weight;
          }
          // If no data yet for this market, skip it (don't contribute to weighted sum)
        });

        return {
          t: timestamp,
          p: weightedSum
        };
      });

      setHistory(aggregatedHistory);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching index price history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [JSON.stringify(markets.map(m => m.market_id)), interval]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  };
}