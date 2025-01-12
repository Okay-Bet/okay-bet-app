import { useState } from "react";
import { Market, LimitlessMarket } from "@/components/types";
import { useBetSlip } from "../app/context/BetSlipContext";
import { useMarketPrices } from "./useMarketPrices";

function isLimitlessMarket(market: Market): market is LimitlessMarket {
  return market.provider === "LIMITLESS";
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
  const currentMarket =
    markets && markets.length > 0 ? markets[activeMarketIndex] : null;

  // Fetch realtime prices for the current market
  const { prices: realtimePrices, loading: pricesLoading } =
    useMarketPrices(currentMarket);

  const handleBetClick = (position: "YES" | "NO") => {
    if (!currentMarket) {
      console.error("No market selected");
      return;
    }

    // Debug log the current state
    console.log("Processing bet for market:", {
      market: currentMarket,
      position,
      realtimePrices,
      staticPrices: currentMarket.prices,
    });

    // Determine which prices to use
    const priceToUse =
      position === "YES"
        ? realtimePrices?.yes?.ask ?? currentMarket.prices.yes.ask
        : realtimePrices?.no?.ask ?? currentMarket.prices.no.ask;

    // Validate price exists and is in valid range
    if (
      typeof priceToUse !== "number" ||
      isNaN(priceToUse) ||
      priceToUse <= 0 ||
      priceToUse > 1
    ) {
      console.error("Invalid price value:", priceToUse);
      return;
    }

    console.log("Using validated price:", priceToUse);

    if (isLimitlessMarket(currentMarket)) {
      const bet = {
        marketId: currentMarket.id,
        eventTitle,
        marketQuestion: currentMarket.question,
        position,
        price: priceToUse,
        tokenId: currentMarket.id,
      };

      // Debug log the final bet object
      console.log("Submitting bet to BetSlip:", bet);
      addBet(bet);
    } else {
      console.error("Unsupported market provider:", currentMarket.provider);
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
    pricesLoading,
  };
}
