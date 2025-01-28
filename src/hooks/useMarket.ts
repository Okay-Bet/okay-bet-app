// hooks/useMarketCard.ts
import { useState } from "react";
import type { LimitlessMarket, MarketOutcome } from "@/components/types";
import { useBetSlip } from "../app/context/BetSlipContext";

interface UseMarketCardParams {
  eventId: string;
  eventTitle: string;
  markets: LimitlessMarket[];
}

interface UseMarketCardReturn {
  currentMarket: LimitlessMarket | null;
  showDetails: boolean;
  showMoneyline: boolean;
  activeMarketIndex: number;
  handleBetClick: (position: MarketOutcome) => void;
  setShowDetails: (show: boolean) => void;
  setShowMoneyline: (show: boolean) => void;
  setActiveMarketIndex: (index: number) => void;
}

export function useMarketCard({
  eventId,
  eventTitle,
  markets,
}: UseMarketCardParams): UseMarketCardReturn {
  const [activeMarketIndex, setActiveMarketIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);

  const { addBet } = useBetSlip();

  const currentMarket = markets && markets.length > 0 ? markets[activeMarketIndex] : null;

  const handleBetClick = (position: MarketOutcome) => {
    if (!currentMarket) return;

    const price = position === "YES" 
      ? currentMarket.prices.yes.ask 
        : currentMarket.prices.no.ask;

    if (!price) return;

      addBet({
      eventTitle,
      marketQuestion: currentMarket.question,
      position,
      price,
        marketId: currentMarket.conditionId,
        tokenId: currentMarket.conditionId,
      provider: "LIMITLESS",
      });
  };

  return {
    currentMarket,
    showDetails,
    showMoneyline,
    activeMarketIndex,
    handleBetClick,
    setShowDetails,
    setShowMoneyline,
    setActiveMarketIndex,
  };
}
