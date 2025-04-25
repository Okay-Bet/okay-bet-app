// src/hooks/useGroupedMarkets.ts

import { useState, useEffect } from "react";
import { useBetSlip } from "../app/context/BetSlipContext";
import type {
  GroupedMarketCard,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
  LimitlessBet,
  PolymarketBet,
  KalshiBet,
} from "../components/types";

interface UseGroupedMarketsReturn {
  groupedMarkets: GroupedMarketCard[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  marketActions: {
    handleBetClick: (market: LimitlessMarket, position: "YES" | "NO") => void;
    handlePolymarketBetClick: (
      market: PolymarketMarket,
      position: "YES" | "NO"
    ) => void;
    handleKalshiBetClick: (
      market: KalshiMarket,
      position: "YES" | "NO"
    ) => void;
    toggleMarketExpanded: (marketId: string) => void;
  };
  marketStates: {
    showMoneyline: boolean;
    setShowMoneyline: (show: boolean) => void;
    expandedMarkets: Set<string>;
    pricesLoading: boolean;
    realtimePrices: null | Record<string, any>;
  };
}

const getMarketPrice = (
  market: LimitlessMarket | PolymarketMarket | KalshiMarket,
  position: "yes" | "no"
): number => {
  if (!market?.prices) return 0;
  return market.prices[position]?.ask || 0;
};

export function useGroupedMarkets(): UseGroupedMarketsReturn {
  const [groupedMarkets, setGroupedMarkets] = useState<GroupedMarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set()
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const { addBet } = useBetSlip();

  const fetchGroupedMarkets = async (
    pageNum: number,
    isLoadingMore = false
  ) => {
    try {
      if (isLoadingMore) {
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/grouped-markets?page=${pageNum}&limit=${ITEMS_PER_PAGE}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch grouped markets");
      }

      // Log the raw data structure to understand what we're receiving
      console.log("Raw API response:", data);

      // Process the data with more flexible validation
      const processedData = data.data
        .map((market: GroupedMarketCard) => {
          // Ensure default values for missing fields
          return {
            id: market.id || `temp-${Math.random()}`,
            question: market.question || "Untitled Market",
            prices: market.prices || { yes: { ask: 0 }, no: { ask: 0 } },
            ...market, // Keep all other existing properties
          };
        })
        .filter((market: GroupedMarketCard) => {
          // Basic validation to ensure we at least have an ID
          return market.id != null;
        });

      setGroupedMarkets((prev) => {
        if (pageNum === 1) {
          return processedData;
        }

        // Create a map of existing markets
        const existingMarketsMap = new Map(
          prev.map((market) => [market.id, market])
        );

        // Update existing markets and add new ones
        processedData.forEach((market) => {
          const existing = existingMarketsMap.get(market.id);
          existingMarketsMap.set(market.id, {
            ...existing, // Keep existing data
            ...market, // Override with new data
            // Ensure prices exist
            prices: market.prices ||
              existing?.prices || { yes: { ask: 0 }, no: { ask: 0 } },
          });
        });

        return Array.from(existingMarketsMap.values());
      });

      setHasMore(processedData.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching markets:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchGroupedMarkets(1);
  }, []);

  const loadMore = () => {
    if (!loading && !isFetchingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGroupedMarkets(nextPage, true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setGroupedMarkets([]);
      setPage(1);
      setHasMore(true);
    };
  }, []);

  // Refresh data periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!loading && !isFetchingMore) {
        Promise.all(
          Array.from({ length: page }, (_, i) => i + 1).map((pageNum) =>
            fetchGroupedMarkets(pageNum, true)
          )
        );
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [page, loading, isFetchingMore]);

  const handleBetClick = (market: LimitlessMarket, position: "YES" | "NO") => {
    const priceToUse = getMarketPrice(
      market,
      position.toLowerCase() as "yes" | "no"
    );

    if (!priceToUse || priceToUse <= 0 || priceToUse > 1) {
      console.error(`Invalid price for ${position}:`, priceToUse);
      return;
    }

    const bet: LimitlessBet = {
      marketId: market.id,
      eventTitle: market.question,
      marketQuestion: market.question,
      position,
      price: priceToUse,
      tokenId: market.id,
      provider: "LIMITLESS",
      marketSlug: market.slug,
    };

    addBet(bet);
  };

  const handlePolymarketBetClick = (
    market: PolymarketMarket,
    position: "YES" | "NO"
  ) => {
    const priceToUse = getMarketPrice(
      market,
      position.toLowerCase() as "yes" | "no"
    );

    if (!priceToUse) return;

    const bet: PolymarketBet = {
      marketId: market.id,
      eventTitle: market.question,
      marketQuestion: market.question,
      position,
      price: priceToUse,
      provider: "POLYMARKET",
      slug: market.slug,
    };

    addBet(bet);
  };

  const handleKalshiBetClick = (
    market: KalshiMarket,
    position: "YES" | "NO"
  ) => {
    const priceToUse = getMarketPrice(
      market,
      position.toLowerCase() as "yes" | "no"
    );

    if (!priceToUse || priceToUse <= 0 || priceToUse > 1) {
      console.error("Invalid price for Kalshi market:", priceToUse);
      return;
    }

    const bet: KalshiBet = {
      marketId: market.id,
      eventTitle: market.question,
      marketQuestion: market.question,
      position,
      price: priceToUse,
      provider: "KALSHI",
      ticker: market.ticker,
    };

    addBet(bet);
  };

  const toggleMarketExpanded = (marketId: string) => {
    setExpandedMarkets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
  };

  return {
    groupedMarkets,
    loading: loading || isFetchingMore,
    error,
    hasMore,
    loadMore,
    marketActions: {
      handleBetClick,
      handlePolymarketBetClick,
      handleKalshiBetClick,
      toggleMarketExpanded,
    },
    marketStates: {
      showMoneyline,
      setShowMoneyline,
      expandedMarkets,
      pricesLoading: false,
      realtimePrices: null,
    },
  };
}
