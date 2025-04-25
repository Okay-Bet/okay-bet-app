// src/hooks/useGroupedMarkets.ts
import { useState, useEffect, useCallback, useRef } from "react";
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

  const fetchInProgress = useRef(false);
  const ITEMS_PER_PAGE = 10;

  const { addBet } = useBetSlip();

  const fetchGroupedMarkets = useCallback(
    async (pageNum: number, isLoadingMore = false) => {
      // Prevent multiple concurrent fetches
      if (fetchInProgress.current) {
        return;
      }

      try {
        fetchInProgress.current = true;
        if (isLoadingMore) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          `/api/grouped-markets?page=${pageNum}&limit=${ITEMS_PER_PAGE}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch markets: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch grouped markets");
        }

        setGroupedMarkets((prev) => {
          if (pageNum === 1) {
            return data.data;
          }
          // Create a map of existing markets to avoid duplicates
          const existingMarketsMap = new Map(
            prev.map((market) => [market.id, market])
          );

          // Update existing markets and add new ones
          data.data.forEach((market: GroupedMarketCard) => {
            existingMarketsMap.set(market.id, market);
          });

          return Array.from(existingMarketsMap.values());
        });

        setHasMore(data.data.length === ITEMS_PER_PAGE);
        setError(null);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
        fetchInProgress.current = false;
      }
    },
    []
  );

  // Initial fetch only
  useEffect(() => {
    fetchGroupedMarkets(1);
    return () => {
      fetchInProgress.current = false;
    };
  }, [fetchGroupedMarkets]);

  const loadMore = useCallback(() => {
    if (!loading && !isFetchingMore && hasMore && !fetchInProgress.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGroupedMarkets(nextPage, true);
    }
  }, [loading, isFetchingMore, hasMore, page, fetchGroupedMarkets]);

  const handleBetClick = useCallback(
    (market: LimitlessMarket, position: "YES" | "NO") => {
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
    },
    [addBet]
  );

  const handlePolymarketBetClick = useCallback(
    (market: PolymarketMarket, position: "YES" | "NO") => {
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
    },
    [addBet]
  );

  const handleKalshiBetClick = useCallback(
    (market: KalshiMarket, position: "YES" | "NO") => {
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
    },
    [addBet]
  );

  const toggleMarketExpanded = useCallback((marketId: string) => {
    setExpandedMarkets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
  }, []);

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
