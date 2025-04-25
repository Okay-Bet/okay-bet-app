// src/components/Markets/GroupedMarketCard.tsx
import React, { useMemo, useCallback } from "react";
import Image from "next/image";
import type {
  GroupedMarketCard as GroupedMarketCardType,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
} from "@/components/types";
import { useGroupedMarkets } from "@/hooks/useGroupedMarkets";

// Move provider logo mapping outside component to prevent recreating on each render
const PROVIDER_LOGOS = {
  LIMITLESS: "/icons/limitless-logo.png",
  POLYMARKET: "/icons/polymarket-logo.jpg",
  KALSHI: "/icons/kalshi-logo.jpeg",
} as const;

// Memoized date formatter
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface MarketDetailsProps {
  market: LimitlessMarket | PolymarketMarket | KalshiMarket;
  className?: string;
}

// Memoized Market Details Section
const MarketDetailsSection = React.memo<MarketDetailsProps>(
  ({ market, className = "" }) => {
    const getVolumeDisplay = useCallback(() => {
      if (market.provider === "KALSHI") {
        const volume = parseFloat(market.volume24H?.toString() || "0");
        return `$${volume.toLocaleString()}`;
      }
      return `$${(
        parseFloat(market.metrics.volumeRaw) / 1e6
      ).toLocaleString()}`;
    }, [market]);

    const getLiquidityDisplay = useCallback(() => {
      if (market.provider === "KALSHI") {
        return `$${parseFloat(market.metrics.liquidity).toLocaleString()}`;
      }
      return `$${(
        parseFloat(market.metrics.openInterestRaw) / 1e6
      ).toLocaleString()}`;
    }, [market]);

    return (
      <div className={`px-4 py-3 rounded-lg ${className}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-gray-500 w-24">Volume:</span>
              <span className="text-gray-800 font-medium">
                {getVolumeDisplay()}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 w-24">
                {market.provider === "KALSHI" ? "Liquidity:" : "Open Interest:"}
              </span>
              <span className="text-gray-800 font-medium">
                {getLiquidityDisplay()}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-gray-500 w-24">Ends:</span>
            <span className="text-gray-800">
              {dateFormatter.format(new Date(market.expirationDate))}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-2">{market.description}</p>
        </div>
      </div>
    );
  }
);

MarketDetailsSection.displayName = "MarketDetailsSection";

// Memoized Market Row component
const MarketRow = React.memo<{
  market: LimitlessMarket | PolymarketMarket | KalshiMarket;
  onBetClick: (market: any, position: "YES" | "NO") => void;
  onExpandClick: () => void;
  provider: keyof typeof PROVIDER_LOGOS;
}>(({ market, onBetClick, onExpandClick, provider }) => {
  const yesBestPrice = useMemo(
    () =>
      market.prices?.yes?.ask
        ? `${(market.prices.yes.ask * 100).toFixed(1)}%`
        : "N/A",
    [market.prices?.yes?.ask]
  );

  const noBestPrice = useMemo(
    () =>
      market.prices?.no?.ask
        ? `${(market.prices.no.ask * 100).toFixed(1)}%`
        : "N/A",
    [market.prices?.no?.ask]
  );

  const handleYesClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBetClick(market, "YES");
    },
    [market, onBetClick]
  );

  const handleNoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBetClick(market, "NO");
    },
    [market, onBetClick]
  );

  return (
    <div
      className="border border-gray-200 rounded-lg hover:border-accent-red-500 
                 transition-all duration-300 cursor-pointer"
      onClick={onExpandClick}
    >
      <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
        <div className="col-span-3 flex justify-center items-center">
          <div className="relative w-16 h-8">
            <Image
              src={PROVIDER_LOGOS[provider]}
              alt={`${provider} Logo`}
              className="object-contain"
              fill
              sizes="64px"
              priority={false} // Only prioritize visible logos
            />
          </div>
        </div>

        <div className="col-span-4">
          <button
            onClick={handleYesClick}
            className="w-full py-2 px-4 rounded bg-green-50 hover:bg-green-100 
                       transition-colors duration-200 border border-green-100"
          >
            <span className="text-green-700 font-medium">{yesBestPrice}</span>
          </button>
        </div>

        <div className="col-span-4">
          <button
            onClick={handleNoClick}
            className="w-full py-2 px-4 rounded bg-red-50 hover:bg-red-100 
                       transition-colors duration-200 border border-red-100"
          >
            <span className="text-red-700 font-medium">{noBestPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

MarketRow.displayName = "MarketRow";

// Main GroupedMarketCard component
export const GroupedMarketCard = React.memo<{
  groupedMarket: GroupedMarketCardType;
}>(({ groupedMarket }) => {
  const { marketActions, marketStates } = useGroupedMarkets();
  const {
    handleBetClick,
    handlePolymarketBetClick,
    handleKalshiBetClick,
    toggleMarketExpanded,
  } = marketActions;
  const { expandedMarkets } = marketStates;

  const { limitlessMarkets, polymarketMarkets, kalshiMarkets, title } =
    groupedMarket;

  // Memoize the expanded markets list
  const expandedMarketsContent = useMemo(() => {
    if (expandedMarkets.size === 0) return null;

    const allMarkets = [
      ...limitlessMarkets,
      ...polymarketMarkets,
      ...kalshiMarkets,
    ];

    return [...expandedMarkets].map((marketId) => {
      const marketData = allMarkets.find((m) => m.market.id === marketId);
      if (!marketData) return null;

      return (
        <MarketDetailsSection
          key={marketId}
          market={marketData.market}
          className="bg-gray-50 rounded-lg mt-2"
        />
      );
    });
  }, [expandedMarkets, limitlessMarkets, polymarketMarkets, kalshiMarkets]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 w-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="p-2 space-y-2">
        {limitlessMarkets.map(({ market }) => (
          <MarketRow
            key={market.id}
            market={market}
            onBetClick={handleBetClick}
            onExpandClick={() => toggleMarketExpanded(market.id)}
            provider="LIMITLESS"
          />
        ))}

        {polymarketMarkets.map(({ market }) => (
          <MarketRow
            key={market.id}
            market={market}
            onBetClick={handlePolymarketBetClick}
            onExpandClick={() => toggleMarketExpanded(market.id)}
            provider="POLYMARKET"
          />
        ))}

        {kalshiMarkets.map(({ market }) => (
          <MarketRow
            key={market.id}
            market={market}
            onBetClick={handleKalshiBetClick}
            onExpandClick={() => toggleMarketExpanded(market.id)}
            provider="KALSHI"
          />
        ))}

        {expandedMarkets.size > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            {expandedMarketsContent}
          </div>
        )}
      </div>
    </div>
  );
});

GroupedMarketCard.displayName = "GroupedMarketCard";

export default GroupedMarketCard;
