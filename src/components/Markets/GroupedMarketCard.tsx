// src/components/Markets/GroupedMarketCard.tsx
import React from "react";
import Image from "next/image";
import type {
  GroupedMarketCard as GroupedMarketCardType,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
} from "@/components/types";
import { formatPrice } from "@/utils/marketUtils";
import { useGroupedMarkets } from "@/hooks/useGroupedMarkets";

interface GroupedMarketCardProps {
  groupedMarket: GroupedMarketCardType;
}

interface MarketDetailsProps {
  isPolymarket?: boolean;
  market: LimitlessMarket | PolymarketMarket | KalshiMarket;
  metrics?: {
    volume?: number;
    liquidity?: number;
    id?: string;
  };
  className?: string;
}

export const GroupedMarketCard: React.FC<GroupedMarketCardProps> = ({
  groupedMarket,
}) => {
  const { marketActions, marketStates } = useGroupedMarkets();
  const {
    handleBetClick,
    handlePolymarketBetClick,
    handleKalshiBetClick,
    toggleMarketExpanded,
  } = marketActions;
  const { showMoneyline, setShowMoneyline, expandedMarkets, pricesLoading } =
    marketStates;

  const { limitlessMarkets, polymarketMarkets, kalshiMarkets, metrics } =
    groupedMarket;
  const primaryLimitlessMarket = limitlessMarkets[0]?.market;

  if (
    !limitlessMarkets ||
    !polymarketMarkets ||
    !kalshiMarkets ||
    !primaryLimitlessMarket
  ) {
    return null;
  }

  const MarketDetailsSection: React.FC<MarketDetailsProps> = ({
    isPolymarket = false,
    market,
    metrics,
    className = "",
  }) => {
    const getVolumeDisplay = () => {
      if (isPolymarket) {
        return `$${(metrics?.volume || 0).toLocaleString()}`;
      }
      // Handle Kalshi market
      if (market.provider === "KALSHI") {
        const volume = parseFloat(market.volume24H?.toString() || "0");
        return `$${volume.toLocaleString()}`;
      }
      // Default Limitless handling
      return `$${(
        parseFloat(market.metrics.volumeRaw) / 1e6
      ).toLocaleString()}`;
    };

    const getLiquidityDisplay = () => {
      if (isPolymarket) {
        return `$${(metrics?.liquidity || 0).toLocaleString()}`;
      }
      // Handle Kalshi market
      if (market.provider === "KALSHI") {
        return `$${parseFloat(market.metrics.liquidity).toLocaleString()}`;
      }
      // Default Limitless handling
      return `$${(
        parseFloat(market.metrics.openInterestRaw) / 1e6
      ).toLocaleString()}`;
    };

    return (
      <div
        className={`px-3 py-2 border-t border-gray-200 bg-gray-50 ${className}`}
      >
        <h3 className="md:hidden text-gray-800 font-medium mb-3">
          {market.question}
        </h3>

        <div className="flex flex-col space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center">
              <span className="text-gray-500 min-w-[90px]">Volume:</span>
              <span className="text-gray-800 font-medium">
                {getVolumeDisplay()}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-gray-500 min-w-[90px]">
                {market.provider === "KALSHI"
                  ? "Liquidity:"
                  : isPolymarket
                  ? "Liquidity:"
                  : "Open Interest:"}
              </span>
              <span className="text-gray-800 font-medium">
                {getLiquidityDisplay()}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-gray-500 min-w-[90px]">Ends:</span>
            <span className="text-gray-800 font-medium">
              {new Date(market.expirationDate).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-2">
            {market.description || "No description available"}
          </p>
        </div>
      </div>
    );
  };

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
              {primaryLimitlessMarket.question}
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
        <div className="space-y-2">
          {/* Limitless Markets */}
          {limitlessMarkets.map(({ market }) => (
            <div
              key={market.id}
              className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300"
            >
              <div className="grid grid-cols-12 gap-2">
                <button
                  onClick={() => toggleMarketExpanded(market.id)}
                  className="col-span-6 py-2 px-2 text-left hover:bg-gray-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="relative w-12 sm:w-16 h-6 flex-shrink-0">
                      <Image
                        src="/icons/limitless-logo.png"
                        alt="Limitless Logo"
                        className="object-contain"
                        fill
                        sizes="(max-width: 640px) 48px, 64px"
                        priority
                      />
                    </div>
                    <span className="text-gray-800 line-clamp-2 text-sm sm:text-base flex-grow">
                      {market.question}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleBetClick(market, "YES")}
                  disabled={market.status !== "ACTIVE" || pricesLoading}
                  className="col-span-3 py-2 px-3 text-green-600 font-header text-center
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
                           border-l border-gray-200 hover:bg-green-600 hover:text-white 
                           active:bg-green-700 transform hover:scale-105"
                >
                  {pricesLoading ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    formatPrice(market.prices.yes.ask || 0, showMoneyline)
                  )}
                </button>

                <button
                  onClick={() => handleBetClick(market, "NO")}
                  disabled={market.status !== "ACTIVE" || pricesLoading}
                  className="col-span-3 py-2 px-3 text-accent-red-500 font-header text-center
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                           border-l border-gray-200 hover:bg-accent-red-500 hover:text-white 
                           active:bg-accent-red-600 transform hover:scale-105"
                >
                  {pricesLoading ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    formatPrice(market.prices.no.ask || 0, showMoneyline)
                  )}
                </button>
              </div>

              {expandedMarkets.has(market.id) && (
                <MarketDetailsSection
                  market={market}
                  className="sm:text-base text-sm"
                />
              )}
            </div>
          ))}

          {/* Polymarket Markets */}
          {polymarketMarkets.map(({ market }) => {
            const marketMetrics = metrics.platforms.polymarket.markets.find(
              (m) => m.id === market.id
            );

            return (
              <div
                key={market.id}
                className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300"
              >
                <div className="grid grid-cols-12 gap-2">
                  <button
                    onClick={() => toggleMarketExpanded(market.id)}
                    className="col-span-6 py-2 px-2 text-left hover:bg-gray-50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="relative w-12 sm:w-16 h-6 flex-shrink-0">
                        <Image
                          src="/icons/polymarket-logo.jpg"
                          alt="Polymarket Logo"
                          className="object-contain"
                          fill
                          sizes="(max-width: 640px) 48px, 64px"
                          priority
                        />
                      </div>
                      <span className="text-gray-800 line-clamp-2 text-sm sm:text-base flex-grow">
                        {market.question}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handlePolymarketBetClick(market, "YES")}
                    className="col-span-3 py-2 px-3 text-green-600 font-header text-center
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-green-600 hover:text-white active:bg-green-700 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.yes.ask || 0, showMoneyline)}
                  </button>

                  <button
                    onClick={() => handlePolymarketBetClick(market, "NO")}
                    className="col-span-3 py-2 px-3 text-accent-red-500 font-header text-center
                             transition-all duration-300 border-l border-gray-200 
                             hover:bg-accent-red-500 hover:text-white active:bg-accent-red-600 
                             transform hover:scale-105"
                  >
                    {formatPrice(market.prices.no.ask || 0, showMoneyline)}
                  </button>
                </div>

                {expandedMarkets.has(market.id) && (
                  <MarketDetailsSection
                    isPolymarket
                    market={market}
                    metrics={marketMetrics}
                    className="sm:text-base text-sm"
                  />
                )}
              </div>
            );
          })}

          {/* Kalshi Markets */}
          {kalshiMarkets.map(({ market }) => {
            const marketMetrics = metrics.platforms.kalshi?.markets.find(
              (m) => m.id === market.id
            );

            return (
              <div
                key={market.id}
                className="border border-gray-200 rounded-lg hover:border-accent-red-500 transition-all duration-300"
              >
                <div className="grid grid-cols-12 gap-2">
                  <button
                    onClick={() => toggleMarketExpanded(market.id)}
                    className="col-span-6 py-2 px-2 text-left hover:bg-gray-50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="relative w-12 sm:w-16 h-6 flex-shrink-0">
                        <Image
                          src="/icons/kalshi-logo.jpeg"
                          alt="Kalshi Logo"
                          className="object-contain"
                          fill
                          sizes="(max-width: 640px) 48px, 64px"
                          priority
                        />
                      </div>
                      <span className="text-gray-800 line-clamp-2 text-sm sm:text-base flex-grow">
                        {market.question}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleKalshiBetClick(market, "YES")}
                    disabled={market.status !== "ACTIVE" || pricesLoading}
                    className="col-span-3 py-2 px-3 text-green-600 font-header text-center
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
                   border-l border-gray-200 hover:bg-green-600 hover:text-white 
                   active:bg-green-700 transform hover:scale-105"
                  >
                    {pricesLoading ? (
                      <span className="text-gray-400 animate-pulse">...</span>
                    ) : (
                      formatPrice(market.prices.yes.ask || 0, showMoneyline)
                    )}
                  </button>

                  <button
                    onClick={() => handleKalshiBetClick(market, "NO")}
                    disabled={market.status !== "ACTIVE" || pricesLoading}
                    className="col-span-3 py-2 px-3 text-accent-red-500 font-header text-center
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                   border-l border-gray-200 hover:bg-accent-red-500 hover:text-white 
                   active:bg-accent-red-600 transform hover:scale-105"
                  >
                    {pricesLoading ? (
                      <span className="text-gray-400 animate-pulse">...</span>
                    ) : (
                      formatPrice(market.prices.no.ask || 0, showMoneyline)
                    )}
                  </button>
                </div>

                {expandedMarkets.has(market.id) && (
                  <MarketDetailsSection
                    market={market}
                    metrics={marketMetrics}
                    className="sm:text-base text-sm"
                  />
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
