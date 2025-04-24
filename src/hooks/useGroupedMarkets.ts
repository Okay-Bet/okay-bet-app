// src/hooks/useGroupedMarkets.ts

import { useState, useEffect } from 'react';
import { useBetSlip } from '../app/context/BetSlipContext';
import type { 
  GroupedMarketCard,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
  LimitlessBet,
  PolymarketBet,
  KalshiBet
} from '../components/types';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UseGroupedMarketsReturn {
  groupedMarkets: GroupedMarketCard[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  marketActions: {
    handleBetClick: (market: LimitlessMarket, position: "YES" | "NO") => void;
    handlePolymarketBetClick: (market: PolymarketMarket, position: "YES" | "NO") => void;
    handleKalshiBetClick: (market: KalshiMarket, position: "YES" | "NO") => void;
    toggleMarketExpanded: (marketId: string) => void;
    handlePageChange: (page: number) => void;
    handleItemsPerPageChange: (itemsPerPage: number) => void;
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
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const { addBet } = useBetSlip();

  useEffect(() => {
    const fetchGroupedMarkets = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/grouped-markets?page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch grouped markets");
        }

        setGroupedMarkets(data.data);
        setPagination({
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems,
          itemsPerPage: data.pagination.itemsPerPage,
          hasNextPage: data.pagination.hasNextPage,
          hasPreviousPage: data.pagination.hasPreviousPage,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGroupedMarkets();
  }, [currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleBetClick = (market: LimitlessMarket, position: "YES" | "NO") => {
    const priceToUse = getMarketPrice(market, position.toLowerCase() as "yes" | "no");

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
    const priceToUse = getMarketPrice(market, position.toLowerCase() as "yes" | "no");
    
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
    const priceToUse = getMarketPrice(market, position.toLowerCase() as "yes" | "no");
  
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
    loading,
    error,
    pagination,
    marketActions: {
      handleBetClick,
      handlePolymarketBetClick,
      handleKalshiBetClick,
      toggleMarketExpanded,
      handlePageChange,
      handleItemsPerPageChange,
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