// hooks/useMarketCard.ts
import { useState } from "react";
import { Market } from "@/components/types/market";
import { useBetSlip } from "../app/context/BetSlipContext";

interface UseMarketCardParams {
  eventId: string;
  eventTitle: string;
  markets: Market[];
}

interface UseMarketCardReturn {
  currentMarket: Market | null;
  showDetails: boolean;
  showMoneyline: boolean;
  activeMarketIndex: number;
  handleBetClick: (position: "YES" | "NO") => void;
  setShowDetails: (show: boolean) => void;
  setShowMoneyline: (show: boolean) => void;
  setActiveMarketIndex: (index: number) => void;
}

export function useMarketCard({
  eventId,
  eventTitle,
  markets,
}: UseMarketCardParams): UseMarketCardReturn {
  // State management
  const [activeMarketIndex, setActiveMarketIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);

  // External hooks
  const { addBet } = useBetSlip();

  // Derive current market
  const currentMarket =
    markets && markets.length > 0 ? markets[activeMarketIndex] : null;

  // Handlers
  const handleBetClick = (position: "YES" | "NO") => {
    if (!currentMarket) return;

    const price =
      position === "YES" ? currentMarket.yesBestAsk : currentMarket.noBestAsk;

    if (!price) return;

    const tokenId =
      position === "YES"
        ? currentMarket.tokens.yes.token_id
        : currentMarket.tokens.no.token_id;

    addBet({
      marketId: currentMarket.condition_id,
      eventTitle,
      marketQuestion: currentMarket.question,
      position,
      price,
      tokenId,
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
