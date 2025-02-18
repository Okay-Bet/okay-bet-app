// components/Markets/GroupedMarketCard.tsx
import React, { useState } from "react";
import Image from "next/image";
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
            <div className="grid grid-cols-12 gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="col-span-6 py-2 px-3 text-left hover:bg-gray-50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-24 h-7 flex-shrink-0">
                    <Image
                      src="/icons/limitless-logo.png"
                      alt="Limitless Logo"
                      className="object-contain"
                      fill
                      sizes="96px"
                      priority
                    />
                  </div>
                  <span className="text-gray-800 line-clamp-2">
                    {limitlessMarket.question}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleBetClick("YES")}
                disabled={!isMarketActive || !yesPrice || pricesLoading}
                className="col-span-3 py-2 px-3 text-green-600 font-header text-center
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
                className="col-span-3 py-2 px-3 text-accent-red-500 font-header text-center
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
              <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Volume:</span>
                    <span className="text-gray-800">
                      $
                      {metrics.platforms.limitless.volume.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Liquidity:</span>
                    <span className="text-gray-800">
                      $
                      {metrics.platforms.limitless.liquidity.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center mb-2">
                  <span className="text-gray-500 w-20">Expiration:</span>
                  <span className="text-gray-800">
                    {new Date(
                      limitlessMarket.expirationDate
                    ).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {limitlessMarket.description || "No description available"}
                </p>
              </div>
            )}
          </div>

          {/* Polymarket Matches */}
          {polymarketMatches.map(({ market }) => {
            const [isExpanded, setIsExpanded] = useState(false);
            // Find the matching metrics for this market
            const marketMetrics = metrics.platforms.polymarket.matches.find(
              (m) => m.id === market.id
            );
            return (
              <div
                key={market.id}
                className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300"
              >
                <div className="grid grid-cols-12 gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="col-span-6 py-2 px-3 text-left hover:bg-gray-50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-24 h-7 flex-shrink-0">
                        <Image
                          src="/icons/polymarket-logo.jpg"
                          alt="Polymarket Logo"
                          className="object-contain"
                          fill
                          sizes="96px"
                          priority
                        />
                      </div>
                      <span className="text-gray-800 line-clamp-2">
                        {market.question}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        `https://polymarket.com/event/${market.id}`,
                        "_blank"
                      )
                    }
                    className="col-span-3 py-2 px-3 text-green-600 font-header text-center
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-green-600 hover:text-white active:bg-green-700 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.yes.ask || 0, showMoneyline)}
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        `https://polymarket.com/event/${market.id}`,
                        "_blank"
                      )
                    }
                    className="col-span-3 py-2 px-3 text-accent-red-500 font-header text-center
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-accent-red-500 hover:text-white active:bg-accent-red-600 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.no.ask || 0, showMoneyline)}
                  </button>
                </div>

                {/* Expanded Polymarket Details */}
                {isExpanded && (
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="flex items-center">
                        <span className="text-gray-500 w-20">Volume:</span>
                        <span className="text-gray-800">
                          $
                          {(marketMetrics?.volume || 0).toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-500 w-20">Liquidity:</span>
                        <span className="text-gray-800">
                          $
                          {(marketMetrics?.liquidity || 0).toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center mb-2">
                      <span className="text-gray-500 w-20">Expiration:</span>
                      <span className="text-gray-800">
                        {new Date(market.expirationDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {market.description || "No description available"}
                    </p>
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
