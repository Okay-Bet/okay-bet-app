// components/Polymarket/MarketCard.tsx
import React from "react";
import { Market } from "@/components/types/market";
import { formatPrice } from "../../utils/marketUtils";
import { useMarketCard } from "../../hooks/useMarketCard";

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

  // Early returns for invalid states
  if (!markets || markets.length === 0 || !currentMarket) {
    return null;
  }

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
              {formatPrice(currentMarket.yesBestAsk, showMoneyline)}
            </div>
          </div>

          <div className="bg-tertiary p-3 rounded-lg">
            <div className="text-sm text-gray-800">No Price</div>
            <div className="text-lg font-bold text-font">
              {formatPrice(currentMarket.noBestAsk, showMoneyline)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleBetClick("YES")}
            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentMarket.active || !currentMarket.yesBestAsk}
          >
            Buy Yes
          </button>
          <button
            onClick={() => handleBetClick("NO")}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentMarket.active || !currentMarket.noBestAsk}
          >
            Buy No
          </button>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Volume</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${currentMarket.volume_num.toLocaleString()}
            </div>
          </div>
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Liquidity</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${currentMarket.liquidity_num.toLocaleString()}
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
                Resolution Rules
              </div>
              <div className="bg-tertiary p-4 rounded-b-lg">
                <p className="text-base font-medium leading-relaxed text-gray-200">
                  {currentMarket.resolutionSource || "Market resolves based on official sources."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};