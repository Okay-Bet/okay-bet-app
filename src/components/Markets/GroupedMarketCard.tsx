// components/Markets/GroupedMarketCard.tsx
import React, { useState } from "react";
import type { GroupedMarketCard as GroupedMarketCardType } from "@/components/types";
import { formatPrice } from "@/utils/marketUtils";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useBetSlip } from "@/app/context/BetSlipContext";

interface GroupedMarketCardProps {
  groupedMarket: GroupedMarketCardType;
}

export const GroupedMarketCard: React.FC<GroupedMarketCardProps> = ({
  groupedMarket,
}) => {
  const { limitlessMarket, polymarketMatches, metrics } = groupedMarket;
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const { addBet } = useBetSlip();

  // Get real-time Limitless prices
  const { prices: realtimePrices, loading: pricesLoading } =
    useMarketPrices(limitlessMarket);

  const handleBetClick = (position: "YES" | "NO") => {
    const priceToUse =
      position === "YES"
        ? realtimePrices?.yes?.ask ?? limitlessMarket.prices.yes.ask
        : realtimePrices?.no?.ask ?? limitlessMarket.prices.no.ask;

    if (
      typeof priceToUse !== "number" ||
      isNaN(priceToUse) ||
      priceToUse <= 0 ||
      priceToUse > 1
    ) {
      return;
    }

    const bet = {
      marketId: limitlessMarket.id,
      eventTitle: limitlessMarket.question,
      marketQuestion: limitlessMarket.question,
      position,
      price: priceToUse,
      tokenId: limitlessMarket.id,
      provider: "LIMITLESS" as const,
    };

    addBet(bet);
  };

  // Get the latest prices with proper fallback handling
  const yesPrice = pricesLoading
    ? limitlessMarket.prices.yes.ask
    : realtimePrices?.yes?.ask ?? limitlessMarket.prices.yes.ask;
  const noPrice = pricesLoading
    ? limitlessMarket.prices.no.ask
    : realtimePrices?.no?.ask ?? limitlessMarket.prices.no.ask;

  const isMarketActive = limitlessMarket.status === "ACTIVE";

  return (
    <div
      className="bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-md hover:shadow-lg 
                    transition-all duration-300 border border-gray-200/80"
    >
      <div className="h-full">
        {/* Market Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-100 to-white">
          <div className="px-4 py-3">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-header text-gray-800 leading-tight line-clamp-3">
                {limitlessMarket.question}
              </h2>
              <button
                onClick={() => setShowMoneyline(!showMoneyline)}
                className="px-2 py-1 bg-white text-gray-600 text-sm font-header rounded 
                         border border-gray-300 hover:bg-gray-50 hover:border-accent-red-500 
                         transition-all duration-300"
              >
                {showMoneyline ? "SHOW %" : "SHOW ML"}
              </button>
            </div>
          </div>
        </div>

        {/* Market Content */}
        <div className="p-4 space-y-3">
          {/* Price Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="group/price">
              <div
                className="bg-gradient-to-br from-white to-gray-100 p-3 rounded border border-gray-200 
                            group-hover/price:border-accent-red-500 group-hover/price:from-gray-100 
                            group-hover/price:to-white transition-all duration-300"
              >
                <div className="text-xs font-header text-gray-500 mb-1">
                  LIMITLESS YES
                </div>
                <div className="text-2xl font-header text-gray-800">
                  {pricesLoading ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    formatPrice(yesPrice, showMoneyline)
                  )}
                </div>
              </div>
            </div>

            <div className="group/price">
              <div
                className="bg-gradient-to-br from-white to-gray-100 p-3 rounded border border-gray-200 
                            group-hover/price:border-accent-red-500 group-hover/price:from-gray-100 
                            group-hover/price:to-white transition-all duration-300"
              >
                <div className="text-xs font-header text-gray-500 mb-1">
                  LIMITLESS NO
                </div>
                <div className="text-2xl font-header text-gray-800">
                  {pricesLoading ? (
                    <span className="text-gray-400 animate-pulse">...</span>
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
              onClick={() => handleBetClick("YES")}
              className="py-2 px-4 bg-white text-green-600 rounded font-header text-lg 
                       border border-green-600 hover:bg-green-600 hover:text-white 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              disabled={!isMarketActive || !yesPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY YES"}
            </button>
            <button
              onClick={() => handleBetClick("NO")}
              className="py-2 px-4 bg-white text-accent-red-500 rounded font-header text-lg 
                       border border-accent-red-500 hover:bg-accent-red-500 hover:text-white 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              disabled={!isMarketActive || !noPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY NO"}
            </button>
          </div>

          {/* Similar Markets Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-header text-gray-800">
                Similar Markets
              </h3>
              <span className="text-sm text-gray-500">
                {polymarketMatches.length} matches found
              </span>
            </div>
            <div className="space-y-3">
              {polymarketMatches.map(({ market }) => (
                <div
                  key={market.id}
                  className="bg-gradient-to-br from-white to-gray-100 p-3 rounded border border-gray-200
                           hover:border-accent-red-500 hover:from-gray-100 hover:to-white 
                           transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-700 text-sm">
                      {market.question}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-sm">
                      <span className="text-gray-500">YES: </span>
                      <span className="text-green-600">
                        {formatPrice(market.prices.yes.ask || 0, showMoneyline)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">NO: </span>
                      <span className="text-accent-red-500">
                        {formatPrice(market.prices.no.ask || 0, showMoneyline)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Stats */}
          <div className="mt-4 bg-gradient-to-br from-white to-gray-100 p-3 rounded border border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Volume:</span>
                <span className="text-gray-800 ml-2">
                  $
                  {(metrics?.totalVolume ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Liquidity:</span>
                <span className="text-gray-800 ml-2">
                  $
                  {(metrics?.highestLiquidity ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 text-gray-500 
                     hover:text-accent-red-500 font-header text-sm transition-colors duration-300 mt-2"
          >
            {showDetails ? "HIDE" : "SHOW"} DETAILS
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
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
            <div className="space-y-3 mt-3">
              <div className="rounded overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-gray-100 to-white py-1 px-2">
                  <h3 className="text-sm font-header text-gray-700">
                    MARKET DETAILS
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-100 p-2">
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Status: {limitlessMarket.status}</p>
                    <p>
                      Expiration:{" "}
                      {new Date(
                        limitlessMarket.expirationDate
                      ).toLocaleDateString()}
                    </p>
                    <p>
                      Description:{" "}
                      {limitlessMarket.description ||
                        "No description available"}
                    </p>
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

export default GroupedMarketCard;
