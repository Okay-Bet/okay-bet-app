// components/Markets/MarketCard.tsx
import React, { useCallback } from "react";
import { Market } from "@/components/types";
import { formatPrice } from "../../utils/marketUtils";
import { useMarketCard } from "../../hooks/useMarketCard";
import { useMarketPrices } from "../../hooks/useMarketPrices";

interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  markets: Market[];
}

export const MarketCard: React.FC<MarketCardProps> = ({
  eventId,
  eventTitle,
  markets,
}) => {
  const {
    currentMarket,
    showDetails,
    showMoneyline,
    activeMarketIndex,
    handleBetClick,
    setShowDetails,
    setShowMoneyline,
    setActiveMarketIndex,
  } = useMarketCard({
    eventId,
    eventTitle,
    markets,
  });

  // Wrapper for bet click handling with debug logging
  const onBetClick = useCallback(
    (position: "YES" | "NO") => {
      console.log("Bet click initiated:", {
        position,
        currentMarket,
        eventTitle,
      });

      if (!currentMarket) {
        console.error("No current market available");
        return;
      }

      handleBetClick(position);
    },
    [currentMarket, eventTitle, handleBetClick]
  );

  // Fetch realtime prices for the current market
  const { prices, loading: pricesLoading } = useMarketPrices(currentMarket);

  // Early returns for invalid states with debug logging
  if (!markets || markets.length === 0 || !currentMarket) {
    console.log("Early return due to invalid market data:", {
      markets,
      currentMarket,
    });
    return null;
  }

  // Get the latest prices with proper fallback handling
  const yesPrice = pricesLoading
    ? currentMarket.prices.yes.ask
    : prices?.yes?.ask ?? currentMarket.prices.yes.ask;
  const noPrice = pricesLoading
    ? currentMarket.prices.no.ask
    : prices?.no?.ask ?? currentMarket.prices.no.ask;

  const isMarketActive = currentMarket.status === "ACTIVE";

  return (
    <div className="bg-demo rounded-xl shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary">{eventTitle}</h2>
          <p className="text-sm text-gray-700">
            {markets.length} active markets
          </p>
        </div>
        <button
          onClick={() => setShowMoneyline(!showMoneyline)}
          className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-full transition-colors"
        >
          {showMoneyline ? "Show %" : "Show ML"}
        </button>
      </div>

      {/* Market Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex -mx-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {markets.map((market, index) => (
            <button
              key={market.id}
              onClick={() => setActiveMarketIndex(index)}
              className={`py-2 px-3 text-sm font-medium transition-colors shrink-0 
                whitespace-normal max-w-[150px] min-h-[48px] 
                ${
                  index === activeMarketIndex
                    ? "bg-black text-white hover:bg-secondary"
                    : "text-primary hover:bg-secondary hover:text-quaternary"
                }`}
            >
              {market.question}
            </button>
          ))}
        </div>
      </div>

      {/* Market Content */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-primary mb-4">
          {currentMarket.question}
        </h3>

        {/* Price Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-tertiary p-3 rounded-lg">
            <div className="text-sm text-gray-800">Yes Price</div>
            <div className="text-lg font-bold text-font">
              {pricesLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                formatPrice(yesPrice, showMoneyline)
              )}
            </div>
          </div>

          <div className="bg-tertiary p-3 rounded-lg">
            <div className="text-sm text-gray-800">No Price</div>
            <div className="text-lg font-bold text-font">
              {pricesLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                formatPrice(noPrice, showMoneyline)
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => onBetClick("YES")}
            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isMarketActive || !yesPrice || pricesLoading}
          >
            {pricesLoading ? "Loading..." : "Buy Yes"}
          </button>
          <button
            onClick={() => onBetClick("NO")}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isMarketActive || !noPrice || pricesLoading}
          >
            {pricesLoading ? "Loading..." : "Buy No"}
          </button>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Volume</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${parseFloat(currentMarket.metrics.volume).toLocaleString()}
            </div>
          </div>
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Liquidity</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${parseFloat(currentMarket.metrics.liquidity).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 text-primary hover:text-gray-500 text-sm mt-4"
        >
          {showDetails ? "Hide" : "Show"} Details
          <svg
            className={`w-4 h-4 transition-transform ${
              showDetails ? "rotate-180" : ""
            }`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Details Section */}
        {showDetails && (
          <div className="mt-6 space-y-6">
            <div>
              <div className="bg-black text-white text-sm font-medium py-2 px-4 rounded-t-lg">
                Description
              </div>
              <div className="bg-tertiary p-4 rounded-b-lg">
                <p className="text-base font-medium leading-relaxed text-gray-200">
                  {currentMarket.description || "No description available"}
                </p>
              </div>
            </div>
            <div>
              <div className="bg-black text-white text-sm font-medium py-2 px-4 rounded-t-lg">
                Market Details
              </div>
              <div className="bg-tertiary p-4 rounded-b-lg">
                <div className="text-base font-medium leading-relaxed text-gray-200">
                  <p>Provider: {currentMarket.provider}</p>
                  <p>
                    Expiration:{" "}
                    {new Date(currentMarket.expirationDate).toLocaleString()}
                  </p>
                  <p>Status: {currentMarket.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
