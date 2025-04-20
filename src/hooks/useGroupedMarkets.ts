// src/hooks/useGroupedMarkets.ts
// src/hooks/useGroupedMarkets.ts
import { useState, useEffect } from "react";
import type {
  GroupedMarketCard,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
  PolymarketBet,
  KalshiBet,
} from "@/components/types";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useBetSlip } from "@/app/context/BetSlipContext";

interface PaginationState {
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
  pagination: PaginationState;
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
    handlePageChange: (page: number) => void;
    handleItemsPerPageChange: (itemsPerPage: number) => void;
  };
  marketStates: {
    showMoneyline: boolean;
    setShowMoneyline: (show: boolean) => void;
    expandedMarkets: Set<string>;
    pricesLoading: boolean;
    realtimePrices: any;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_ITEMS_PER_PAGE = 10;

function useGroupedMarkets(): UseGroupedMarketsReturn {
  const [groupedMarkets, setGroupedMarkets] = useState<GroupedMarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set()
  );

  // Add pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: DEFAULT_PAGE,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const { addBet } = useBetSlip();

  // Fetch grouped markets data with pagination
  const fetchGroupedMarkets = async (page: number, limit: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/grouped-markets?page=${page}&limit=${limit}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch grouped markets");
      }

      setGroupedMarkets(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when pagination changes
  useEffect(() => {
    fetchGroupedMarkets(pagination.currentPage, pagination.itemsPerPage);
  }, [pagination.currentPage, pagination.itemsPerPage]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
    }));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination((prev) => ({
      ...prev,
      itemsPerPage,
      currentPage: 1, // Reset to first page when changing items per page
    }));
  };

  const handleBetClick = (market: LimitlessMarket, position: "YES" | "NO") => {
    console.log("Handling bet click:", { market, position }); // Debug log

    const priceToUse =
      position === "YES" ? market.prices?.yes?.ask : market.prices?.no?.ask;

    if (
      typeof priceToUse !== "number" ||
      isNaN(priceToUse) ||
      priceToUse <= 0 ||
      priceToUse > 1
    ) {
      console.warn(`Invalid price for ${position}:`, priceToUse);
      return;
    }

    // Debug log for market.slug
    console.log("Market slug:", market.slug);

    if (!market.slug) {
      console.error("Missing market slug:", market);
      return;
    }

    const bet = {
      marketId: market.id,
      eventTitle: market.question,
      marketQuestion: market.question,
      position,
      price: priceToUse,
      tokenId: market.id,
      provider: "LIMITLESS" as const,
      marketSlug: market.slug,
    };

    console.log("Creating bet:", bet); // Debug log
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

    if (priceToUse === undefined) return;

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

    if (
      typeof priceToUse !== "number" ||
      isNaN(priceToUse) ||
      priceToUse <= 0 ||
      priceToUse > 1
    ) {
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

export { useGroupedMarkets };
