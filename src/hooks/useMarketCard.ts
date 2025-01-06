// hooks/useMarketCard.ts
import { useState, useEffect, useMemo } from "react";
import { useMarket } from "./useMarket";
import { useBetSlip } from "@/app/context/BetSlipContext";
import { OrderBook, MarketCardState } from "../types/market";

export const useMarketCard = (
  eventId: string,
  eventTitle: string,
  marketIndices: number[],
  marketSubTitles: string[]
) => {
  const [activeMarketIndex, setActiveMarketIndex] = useState(marketIndices[0]);
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const { addBet } = useBetSlip();

  const { market, loading, error, marketLiquidities } = useMarket(
    eventId,
    activeMarketIndex
  );

  const orderBook = useMemo((): OrderBook => {
    if (!market) return { yes: {}, no: {} };
    
    return {
      yes: {
        bid: market.yesBestBid,
        ask: market.yesBestAsk
      },
      no: {
        bid: market.noBestBid,
        ask: market.noBestAsk
      }
    };
  }, [market]);

  // Sort markets by liquidity
  const sortedData = useMemo(() => {
    return marketIndices
      .map((index, i) => ({
        index,
        subtitle: marketSubTitles[i],
        liquidity: marketLiquidities[i] || 0,
      }))
      .sort((a, b) => b.liquidity - a.liquidity);
  }, [marketIndices, marketSubTitles, marketLiquidities]);

  // Set initial market based on liquidity
  useEffect(() => {
    if (marketLiquidities.length > 0 && activeMarketIndex === marketIndices[0]) {
      const highestLiquidityMarket = sortedData[0];
      if (highestLiquidityMarket) {
        setActiveMarketIndex(highestLiquidityMarket.index);
      }
    }
  }, [marketLiquidities, sortedData]);

  const handleBetClick = (position: "YES" | "NO") => {
    const price = position === "YES" 
      ? orderBook.yes.ask
      : orderBook.no.ask;
    
    if (!price || !market) return;
  
    const tokenId = position === "YES"
      ? market.tokens.yes.token_id
      : market.tokens.no.token_id;
  
    addBet({
      marketId: market.condition_id,
      eventTitle,
      marketQuestion: market.question,
      position,
      price,
      tokenId,
    });
  };

  const state: MarketCardState = {
    market,
    orderBook,
    sortedData,
    showDetails,
    showMoneyline,
    loading,
    error
  };

  const actions = {
    setActiveMarketIndex,
    setShowDetails,
    setShowMoneyline,
    handleBetClick
  };

  return {
    state,
    actions
  };
};