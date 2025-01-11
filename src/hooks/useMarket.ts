// hooks/useMarketCard.ts
import { useState } from "react";
import type {
  Market,
  LimitlessMarket,
  PolymarketMarket,
  MarketOutcome,
} from "@/components/types";
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
  handleBetClick: (position: MarketOutcome) => void;
  setShowDetails: (show: boolean) => void;
  setShowMoneyline: (show: boolean) => void;
  setActiveMarketIndex: (index: number) => void;
}

// Type guard to check if a market is a Polymarket market
function isPolymarketMarket(market: Market): market is PolymarketMarket {
  return market.provider === "POLYMARKET";
}

// Type guard to check if a market is a Limitless market
function isLimitlessMarket(market: Market): market is LimitlessMarket {
  return market.provider === "LIMITLESS";
}

export function useMarketCard({
  eventId,
  eventTitle,
  markets,
}: UseMarketCardParams): UseMarketCardReturn {
  // Basic state management
  const [activeMarketIndex, setActiveMarketIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);

  const { addBet } = useBetSlip();

  // Get current market with proper type checking
  const currentMarket =
    markets && markets.length > 0 ? markets[activeMarketIndex] : null;

  const handleBetClick = (position: MarketOutcome) => {
    if (!currentMarket) return;

    // Get price from unified price structure
    const price =
      position === "YES"
        ? currentMarket.prices.yes.ask
        : currentMarket.prices.no.ask;

    if (!price) return;

    // Base bet data that's common across providers
    const baseBetData = {
      eventTitle,
      marketQuestion: currentMarket.question,
      position,
      price,
    };

    // Handle provider-specific bet creation
    if (isPolymarketMarket(currentMarket)) {
      // Polymarket-specific handling
      addBet({
        ...baseBetData,
        marketId: currentMarket.id,
        tokenId:
          position === "YES"
            ? currentMarket.outcomeTokens.yes
            : currentMarket.outcomeTokens.no,
        provider: "POLYMARKET",
      });
    } else if (isLimitlessMarket(currentMarket)) {
      // Limitless-specific handling
      addBet({
        ...baseBetData,
        marketId: currentMarket.conditionId,
        // Limitless uses conditionId as the token identifier
        tokenId: currentMarket.conditionId,
        provider: "LIMITLESS",
      });
    } else {
      console.error("Unknown market provider:", currentMarket.provider);
    }
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
