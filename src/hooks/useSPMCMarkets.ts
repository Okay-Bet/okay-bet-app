/**
 * Hook for fetching market data from SPMC
 */

import { useState, useEffect } from 'react';
import { spmcClient } from '@/services/spmc';
import { SPMCMarketsRequest, SPMCMarket, SPMCSearchRequest, Platform } from '@/services/spmc/types';
import { transformMarketData } from '@/services/spmc/transformers';

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
        setResults(response.data.results);
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