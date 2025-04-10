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

interface UseGroupedMarketsReturn {
  groupedMarkets: GroupedMarketCard[];
  loading: boolean;
  error: string | null;
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
    realtimePrices: any; // Type this properly based on useMarketPrices return
  };
}

function useGroupedMarkets(): UseGroupedMarketsReturn {
  const [groupedMarkets, setGroupedMarkets] = useState<GroupedMarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set()
  );

  const { addBet } = useBetSlip();

  // Fetch grouped markets data
  useEffect(() => {
    const fetchGroupedMarkets = async () => {
      try {
        const response = await fetch("/api/grouped-markets");
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch grouped markets");
        }

        setGroupedMarkets(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGroupedMarkets();
  }, []);

  const handleBetClick = (market: LimitlessMarket, position: "YES" | "NO") => {
    const priceToUse = position === "YES" 
      ? market.prices?.yes?.ask 
      : market.prices?.no?.ask;
  
    if (typeof priceToUse !== "number" || isNaN(priceToUse) || priceToUse <= 0 || priceToUse > 1) {
      console.warn(`Invalid price for ${position}:`, priceToUse);
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
    };
  
    addBet(bet);
  };

  const handlePolymarketBetClick = (
    market: PolymarketMarket,
    position: "YES" | "NO"
  ) => {
    const priceToUse = getMarketPrice(market, position.toLowerCase() as "yes" | "no");
    
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
    const priceToUse = getMarketPrice(market, position.toLowerCase() as "yes" | "no");
  
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

export { useGroupedMarkets };
