// components/Markets/MarketCard.tsx
import React, { useCallback } from "react";
import { LimitlessMarket } from "@/components/types";
import { formatPrice } from "../../utils/marketUtils";
import { useMarketCard } from "../../hooks/useMarketCard";
import { useMarketPrices } from "../../hooks/useMarketPrices";

interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  markets: LimitlessMarket[];
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
    <div
      className="bg-gradient-harsh from-accent-red-500 to-tertiary p-[2px] rounded-lg shadow-aggressive 
                    transform transition-all duration-300 hover:scale-[1.02] hover:shadow-neon 
                    hover:z-10 cursor-pointer group"
    >
      <div className="bg-black rounded-lg overflow-hidden h-full">
        {/* Header Section - Redesigned for better readability */}
        <div className="relative border-b-2 border-accent-red-500">
          <div className="px-4 py-3 bg-gradient-aggressive from-accent-red-500/20 to-transparent">
            {/* Title container with proper wrapping */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-start gap-4">
                <h2
                  className="text-2xl font-header text-white tracking-wider text-shadow-aggressive 
                             leading-tight group-hover:text-electric-cyan transition-colors line-clamp-3"
                >
                  {eventTitle}
                </h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoneyline(!showMoneyline);
                  }}
                  className="flex-shrink-0 px-2 py-1 bg-black text-electric-cyan text-sm font-header rounded 
                             border border-accent-red-500 hover:bg-accent-red-500 hover:text-white 
                             transition-all duration-300 whitespace-nowrap"
                >
                  {showMoneyline ? "SHOW %" : "SHOW ML"}
                </button>
              </div>
              {/* Question display
              {currentMarket.question && (
                <div className="text-sm text-accent-gray-400 font-medium leading-snug">
                  {currentMarket.question}
                </div>
              )} */}
            </div>
          </div>
        </div>

        {/* Market Content */}
        <div className="p-4 space-y-3">
          {/* Price Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden group/price">
              <div
                className="absolute inset-0 bg-gradient-aggressive from-accent-red-500 to-tertiary opacity-0 
                            group-hover/price:opacity-100 transition-opacity duration-300 blur-sm"
              ></div>
              <div
                className="relative bg-accent-gray-900 p-3 rounded border border-accent-red-500/30 
                            group-hover/price:border-accent-red-500 transition-colors"
              >
                <div className="text-xs font-header text-accent-gray-400 mb-1">
                  YES PRICE
                </div>
                <div className="text-2xl font-header text-electric-cyan group-hover/price:text-white transition-colors">
                  {pricesLoading ? (
                    <span className="text-accent-gray-600 animate-pulse">
                      ...
                    </span>
                  ) : (
                    formatPrice(yesPrice, showMoneyline)
                  )}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden group/price">
              <div
                className="absolute inset-0 bg-gradient-aggressive from-accent-red-500 to-tertiary opacity-0 
                            group-hover/price:opacity-100 transition-opacity duration-300 blur-sm"
              ></div>
              <div
                className="relative bg-accent-gray-900 p-3 rounded border border-accent-red-500/30 
                            group-hover/price:border-accent-red-500 transition-colors"
              >
                <div className="text-xs font-header text-accent-gray-400 mb-1">
                  NO PRICE
                </div>
                <div className="text-2xl font-header text-electric-cyan group-hover/price:text-white transition-colors">
                  {pricesLoading ? (
                    <span className="text-accent-gray-600 animate-pulse">
                      ...
                    </span>
                  ) : (
                    formatPrice(noPrice, showMoneyline)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onBetClick("YES")}
              className="py-2 px-4 bg-black text-green-500 rounded font-header text-lg border border-green-500
                       hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-300 transform hover:-translate-y-0.5"
              disabled={!isMarketActive || !yesPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY YES"}
            </button>
            <button
              onClick={() => onBetClick("NO")}
              className="py-2 px-4 bg-black text-accent-red-500 rounded font-header text-lg border border-accent-red-500
                       hover:bg-accent-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-300 transform hover:-translate-y-0.5"
              disabled={!isMarketActive || !noPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY NO"}
            </button>
          </div>

          {/* Market Stats */}
          <div className="bg-black p-3 rounded border border-accent-gray-800 hover:border-accent-red-500 
                        transition-all duration-300 group/stats">
            <div className="flex items-center justify-between">
              <div className="text-sm font-header text-accent-gray-400">
                TOTAL VOLUME
              </div>
              <div className="text-lg font-header text-electric-cyan group-hover/stats:text-accent-red-500 
                           transition-colors">
                ${parseFloat(currentMarket.metrics.volume).toFixed(2).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 text-accent-gray-400 hover:text-electric-cyan 
                     font-header text-sm transition-colors duration-300 mt-2 group/details"
          >
            {showDetails ? "HIDE" : "SHOW"} DETAILS
            <svg
              className={`w-4 h-4 transition-transform duration-300 group-hover/details:text-electric-cyan
                         ${showDetails ? "rotate-180" : ""}`}
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
            <div className="space-y-3 mt-3">
              <div className="rounded overflow-hidden">
                <div className="bg-accent-red-500 py-1 px-2">
                  <h3 className="text-sm font-header text-white">
                    DESCRIPTION
                  </h3>
                </div>
                <div className="bg-black p-2 border-x border-b border-accent-red-500/30">
                  <p className="text-sm text-accent-gray-300 leading-tight">
                    {currentMarket.description || "No description available"}
                  </p>
                </div>
              </div>

              <div className="rounded overflow-hidden">
                <div className="bg-accent-red-500 py-1 px-2">
                  <h3 className="text-sm font-header text-white">
                    MARKET DETAILS
                  </h3>
                </div>
                <div className="bg-black p-2 border-x border-b border-accent-red-500/30">
                  <div className="space-y-1 text-sm text-accent-gray-300">
                    <p>Provider: {currentMarket.provider}</p>
                    <p>
                      Expiration:{" "}
                      {new Date(
                        currentMarket.expirationDate
                      ).toLocaleDateString()}
                    </p>
                    <p>Status: {currentMarket.status}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
