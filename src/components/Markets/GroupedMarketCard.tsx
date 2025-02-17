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
      className="bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-md hover:shadow-lg 
                    transition-all duration-300 border border-gray-200/80 w-full"
    >
      {/* Market Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-100 to-white">
        <div className="px-4 py-3">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-header text-gray-800 leading-tight">
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
      <div className="p-4">
        {/* Markets Table */}
        <div className="space-y-2">
          {/* Limitless Market Row */}
          <div className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300">
            <div className="grid grid-cols-12 gap-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="col-span-6 p-4 text-left hover:bg-gray-50 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-accent-red-500">
                    LIMITLESS
                  </span>
                  <span className="text-gray-800">
                    {limitlessMarket.question}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleBetClick("YES")}
                disabled={!isMarketActive || !yesPrice || pricesLoading}
                className="col-span-3 p-4 text-green-600 font-header
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
                         border-l border-gray-200 hover:bg-green-600 hover:text-white 
                         active:bg-green-700 transform hover:scale-105"
              >
                {pricesLoading ? (
                  <span className="text-gray-400 animate-pulse">...</span>
                ) : (
                  formatPrice(yesPrice, showMoneyline)
                )}
              </button>

              <button
                onClick={() => handleBetClick("NO")}
                disabled={!isMarketActive || !noPrice || pricesLoading}
                className="col-span-3 p-4 text-accent-red-500 font-header
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                         border-l border-gray-200 hover:bg-accent-red-500 hover:text-white 
                         active:bg-accent-red-600 transform hover:scale-105"
              >
                {pricesLoading ? (
                  <span className="text-gray-400 animate-pulse">...</span>
                ) : (
                  formatPrice(noPrice, showMoneyline)
                )}
              </button>
            </div>

            {/* Expanded Details */}
            {showDetails && (
              <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                <div className="mt-4 text-sm text-gray-600 space-y-2">
                <div className="grid grid-cols-2 gap-4 mt-2">
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
                        {(metrics?.highestLiquidity ?? 0).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                  <p>
                    Expiration:{" "}
                    {new Date(
                      limitlessMarket.expirationDate
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    {limitlessMarket.description || "No description available"}
                  </p>

                </div>
              </div>
            )}
          </div>

          {/* Polymarket Matches */}
          {polymarketMatches.map(({ market }) => {
            const [isExpanded, setIsExpanded] = useState(false);
            return (
              <div
                key={market.id}
                className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300"
              >
                <div className="grid grid-cols-12 gap-4">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="col-span-6 p-4 text-left hover:bg-gray-50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-500">
                        POLY
                      </span>
                      <span className="text-gray-800">{market.question}</span>
                    </div>
                  </button>

                  <a
                    href={`https://polymarket.com/event/${market.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-3 p-4 text-green-600 font-header
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-green-600 hover:text-white active:bg-green-700 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.yes.ask || 0, showMoneyline)}
                  </a>

                  <a
                    href={`https://polymarket.com/event/${market.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-3 p-4 text-accent-red-500 font-header
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-accent-red-500 hover:text-white active:bg-accent-red-600 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.no.ask || 0, showMoneyline)}
                  </a>
                </div>

                {/* Expanded Polymarket Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                    <div className="mt-4 text-sm text-gray-600 space-y-2">
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <span className="text-gray-500">Volume:</span>
                          <span className="text-gray-800 ml-2">
                            $
                            {(market.volume_num || 0).toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Liquidity:</span>
                          <span className="text-gray-800 ml-2">
                            {" "}
                            $
                            {(market.liquidity_num || 0).toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      <p>
                        Expiration:{" "}
                        {new Date(market.expirationDate).toLocaleDateString()}
                      </p>
                      <p>{market.description || "No description available"}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GroupedMarketCard;
