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
  page: number;
  loadMore: (newPage: number) => void;
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const fetchInProgress = useRef(false);
  const ITEMS_PER_PAGE = 9;

  const { addBet } = useBetSlip();

const fetchGroupedMarkets = useCallback(
    async (pageNum: number, isLoadingMore = false) => {
      if (loadingRef.current || fetchInProgress.current) {
        return;
      }

      loadingRef.current = true;
      fetchInProgress.current = true;

      try {
        setLoading(true);
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(
          `/api/grouped-markets?page=${pageNum}&limit=${ITEMS_PER_PAGE}&t=${timestamp}`,
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            // Add credentials if needed
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch markets: ${response.status}`);
        }

        const data = await response.json();
        
        // Add debug logging
        console.log('API Response:', data);
        console.log('Page:', pageNum);
        console.log('Markets count:', data.data?.length);
        console.log('Pagination:', data.pagination);

        // Check if data has the expected structure
        if (!data.data) {
          throw new Error('Invalid data structure received from API');
        }

        setGroupedMarkets(data.data);
        // Update hasMore based on pagination info
        setHasMore(data.pagination?.hasNextPage ?? false);
        setPage(pageNum);
        setError(null);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        loadingRef.current = false;
        fetchInProgress.current = false;
        setLoading(false);
      }
    },
    []
  );

  // Initial fetch only
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      fetchGroupedMarkets(1);
    }

    return () => {
      mounted = false;
      fetchInProgress.current = false;
    };
  }, [fetchGroupedMarkets]);

  const loadMore = useCallback(
    (newPage: number) => {
      if (loadingRef.current || fetchInProgress.current) {
        return;
      }
      fetchGroupedMarkets(newPage, false);
    },
    [fetchGroupedMarkets]
  );

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
    page,
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
