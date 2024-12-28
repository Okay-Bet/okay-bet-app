// hooks/useMarket.ts
import { useState, useEffect } from "react";
import type { Market } from "@/components/types/market";

// Cache duration constant - 5 minutes
// We define this at the top for easy configuration
const CACHE_DURATION = 5 * 60 * 1000;

// Generic cache implementation with type safety
class Cache<T> {
  private store: Map<string, { data: T; timestamp: number }> = new Map();

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

  clear() {
    this.store.clear();
  }
}

// Interface for hook return value - keeps our return type consistent
interface UseMarketResult {
  market: Market | null;
  loading: boolean;
  error: string | null;
  marketLiquidities: number[];
  refetch: () => Promise<void>; // Added refetch capability
}

// Initialize cache at module level for persistence across hook instances
const marketCache = new Cache<Market[]>();

/**
 * Hook to fetch and manage market data for a specific event
 * @param eventId - The ID of the event containing the markets
 * @param marketIndex - The index of the specific market within the event
 * @returns Market data, loading state, error state, market liquidities, and refetch function
 */
export function useMarket(
  eventId: string,
  marketIndex: number
): UseMarketResult {
  const [data, setData] = useState<UseMarketResult>({
    market: null,
    loading: true,
    error: null,
    marketLiquidities: [],
    refetch: async () => {}, // Will be properly initialized in useEffect
  });

  useEffect(() => {
    let isMounted = true;

    // Define the fetch function within useEffect to access isMounted
    const fetchMarketData = async () => {
      try {
        // First check the cache
        const cachedMarkets = marketCache.get(eventId);
        if (cachedMarkets) {
          if (isMounted) {
            setData({
              market: cachedMarkets[marketIndex] || null,
              loading: false,
              error: null,
              marketLiquidities: cachedMarkets.map((m) => m.liquidity_num),
              refetch: fetchMarketData,
            });
          }
          return;
        }

        // If not in cache, fetch from API
        const response = await fetch(`/api/polymarket-markets/${eventId}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch markets: ${response.status} ${response.statusText}`
          );
        }

        const markets: Market[] = await response.json();

        // Validate the marketIndex is within bounds
        if (marketIndex >= markets.length) {
          throw new Error(`Market index ${marketIndex} is out of bounds`);
        }

        // Cache the full markets array
        marketCache.set(eventId, markets);

        if (isMounted) {
          setData({
            market: markets[marketIndex],
            loading: false,
            error: null,
            marketLiquidities: markets.map((m) => m.liquidity_num),
            refetch: fetchMarketData,
          });
        }
      } catch (error) {
        console.error("Error fetching market data:", error);
        if (isMounted) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "An error occurred",
            refetch: fetchMarketData,
          }));
        }
      }
    };

    // Initial fetch
    fetchMarketData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [eventId, marketIndex]); // Dependencies that trigger refetch

  return data;
}

/**
 * Helper function to manually clear the market cache
 * Useful for testing or forcing fresh data fetches
 */
export function clearMarketCache(): void {
  marketCache.clear();
}
