// hooks/useMarket.ts
import { useState, useEffect } from "react";

// Cache implementation
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();

  set(key: string, data: T) {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data;
  }
}

// Maintain separate caches for events and markets
const eventCache = new Cache<Event>();
const marketCache = new Cache<Market>();

export interface Event {
  id: string;
  title: string;
  liquidity: number;
  volume: number;
  description?: string;
  markets: Array<{
    id: string;
    question: string;
    liquidity: number;
  }>;
}

export interface Market {
  end_date_iso: string;
  condition_id: string;
  question: string;
  description?: string;
  resolutionSource?: string;
  volume_num: number;
  liquidity_num: number;
  bestAsk?: number;
  active?: boolean;
  tokens: {
    yes: {
      token_id: string;
      outcome: string;
    };
    no: {
      token_id: string;
      outcome: string;
    };
  };
}

interface UseMarketResult {
  market: Market | null;
  loading: boolean;
  error: string | null;
  marketLiquidities: number[];
}

// Main market hook
export const useMarket = (
  eventId: string,
  marketIndex: number
): UseMarketResult => {
  const [data, setData] = useState<UseMarketResult>({
    market: null,
    loading: true,
    error: null,
    marketLiquidities: [],
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        // Check cache first
        const cachedEvent = eventCache.get(eventId);
        if (cachedEvent) {
          if (isMounted) {
            setData({
              market: cachedEvent.markets[marketIndex],
              loading: false,
              error: null,
              marketLiquidities: cachedEvent.markets.map(m => m.liquidity),
            });
          }
          return;
        }

        const response = await fetch('/api/markets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'market',
            eventId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }

        // Cache the result
        eventCache.set(eventId, result);

        if (isMounted) {
          setData({
            market: result.markets[marketIndex],
            loading: false,
            error: null,
            marketLiquidities: result.markets.map(m => m.liquidity),
          });
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'An error occurred',
          }));
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [eventId, marketIndex]);

  return data;
};

// Optimized top events fetching
let lastTopEventsFetch = 0;
let cachedTopEvents: Event[] = [];

export const fetchTopLiquidityEvents = async (
  limit: number = 10
): Promise<Event[]> => {
  // Return cached results if less than 5 minutes old
  if (Date.now() - lastTopEventsFetch < CACHE_DURATION) {
    return cachedTopEvents.slice(0, limit);
  }

  try {
    const response = await fetch('/api/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'topEvents',
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    cachedTopEvents = data.events || [];
    lastTopEventsFetch = Date.now();
    
    return cachedTopEvents.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top events:', error);
    return [];
  }
};