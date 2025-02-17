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
      className="bg-gradient-harsh from-accent-red-500 to-tertiary p-[2px] rounded-lg shadow-aggressive 
                    transform transition-all duration-300 hover:scale-[1.02] hover:shadow-neon hover:z-10"
    >
      <div className="bg-black rounded-lg overflow-hidden h-full">
        {/* Limitless Market Header */}
        <div className="border-b-2 border-accent-red-500">
          <div className="px-4 py-3 bg-gradient-aggressive from-accent-red-500/20 to-transparent">
            <div className="flex justify-between items-start">
              <h2
                className="text-2xl font-header text-white tracking-wider text-shadow-aggressive 
                           leading-tight group-hover:text-electric-cyan transition-colors line-clamp-3"
              >
                {limitlessMarket.question}
              </h2>
              <button
                onClick={() => setShowMoneyline(!showMoneyline)}
                className="px-2 py-1 bg-black text-electric-cyan text-sm font-header rounded 
                         border border-accent-red-500 hover:bg-accent-red-500 hover:text-white 
                         transition-all duration-300"
              >
                {showMoneyline ? "SHOW %" : "SHOW ML"}
              </button>
            </div>
          </div>
        </div>

        {/* Limitless Market Content */}
        <div className="p-4 space-y-3">
          {/* Limitless Price Display */}
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
                  LIMITLESS YES
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
                  LIMITLESS NO
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
              onClick={() => handleBetClick("YES")}
              className="py-2 px-4 bg-black text-green-500 rounded font-header text-lg border border-green-500
                       hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-300 transform hover:-translate-y-0.5"
              disabled={!isMarketActive || !yesPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY YES"}
            </button>
            <button
              onClick={() => handleBetClick("NO")}
              className="py-2 px-4 bg-black text-accent-red-500 rounded font-header text-lg border border-accent-red-500
                       hover:bg-accent-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-300 transform hover:-translate-y-0.5"
              disabled={!isMarketActive || !noPrice || pricesLoading}
            >
              {pricesLoading ? "..." : "BUY NO"}
            </button>
          </div>

          {/* Polymarket Matches Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-header text-electric-cyan">
                Similar Markets
              </h3>
              <span className="text-sm text-accent-gray-400">
                {polymarketMatches.length} matches found
              </span>
            </div>
            <div className="space-y-3">
              {polymarketMatches.map(({ market, similarity }) => (
                <div
                  key={market.id}
                  className="bg-accent-gray-900 p-3 rounded border border-accent-red-500/30
                           hover:border-accent-red-500 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white text-sm">
                      {market.question}
                    </span>
                    <span className="text-accent-gray-400 text-xs">
                      {(similarity * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-sm">
                      <span className="text-accent-gray-400">YES: </span>
                      <span className="text-green-500">
                        {formatPrice(market.prices.yes.ask || 0, showMoneyline)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-accent-gray-400">NO: </span>
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
          <div className="mt-4 bg-accent-gray-900 p-3 rounded border border-accent-gray-800">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-accent-gray-400">Volume:</span>
                <span className="text-electric-cyan ml-2">
                  $
                  {(metrics?.totalVolume ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-accent-gray-400">Liquidity:</span>
                <span className="text-electric-cyan ml-2">
                  $
                  {(metrics?.highestLiquidity ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-accent-gray-400">Match:</span>
                <span className="text-electric-cyan ml-2">
                  {((metrics?.averageSimilarity ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 text-accent-gray-400 
                     hover:text-electric-cyan font-header text-sm transition-colors duration-300 mt-2"
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
              <div className="rounded overflow-hidden">
                <div className="bg-accent-red-500 py-1 px-2">
                  <h3 className="text-sm font-header text-white">
                    MARKET DETAILS
                  </h3>
                </div>
                <div className="bg-black p-2 border-x border-b border-accent-red-500/30">
                  <div className="space-y-1 text-sm text-accent-gray-300">
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
