import React from "react";
import Image from "next/image";
import type {
  GroupedMarketCard as GroupedMarketCardType,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
} from "@/components/types";
import { useGroupedMarkets } from "@/hooks/useGroupedMarkets";

interface GroupedMarketCardProps {
  groupedMarket: GroupedMarketCardType;
}

interface MarketDetailsProps {
  market: LimitlessMarket | PolymarketMarket | KalshiMarket;
  metrics?: {
    volume?: number;
    liquidity?: number;
    id?: string;
  };
  className?: string;
}

// Market details section for expanded view
const MarketDetailsSection: React.FC<MarketDetailsProps> = ({
  market,
  metrics,
  className = "",
}) => {
  const getVolumeDisplay = () => {
    if (market.provider === "KALSHI") {
      const volume = parseFloat(market.volume24H?.toString() || "0");
      return `$${volume.toLocaleString()}`;
    }
    return `$${(parseFloat(market.metrics.volumeRaw) / 1e6).toLocaleString()}`;
  };

  const getLiquidityDisplay = () => {
    if (market.provider === "KALSHI") {
      return `$${parseFloat(market.metrics.liquidity).toLocaleString()}`;
    }
    return `$${(
      parseFloat(market.metrics.openInterestRaw) / 1e6
    ).toLocaleString()}`;
  };

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

        <p className="text-sm text-gray-600 mt-2">{market.description}</p>
      </div>
    </div>
  );
};

const MarketRow: React.FC<{
  market: LimitlessMarket | PolymarketMarket | KalshiMarket;
  onBetClick: (market: any, position: "YES" | "NO") => void;
  onExpandClick: () => void;
  provider: "LIMITLESS" | "POLYMARKET" | "KALSHI";
}> = ({ market, onBetClick, onExpandClick, provider }) => {
  const getProviderLogo = () => {
    switch (provider) {
      case "LIMITLESS":
        return "/icons/limitless-logo.png";
      case "POLYMARKET":
        return "/icons/polymarket-logo.jpg";
      case "KALSHI":
        return "/icons/kalshi-logo.jpeg";
    }
  };

  // Get best prices (lowest ask)
  const yesBestPrice = market.prices?.yes?.ask 
    ? `${(market.prices.yes.ask * 100).toFixed(1)}%`
    : "N/A";
  const noBestPrice = market.prices?.no?.ask
    ? `${(market.prices.no.ask * 100).toFixed(1)}%`
    : "N/A";

  return (
    <div 
      className="border border-gray-200 rounded-lg hover:border-accent-red-500 
                 transition-all duration-300 cursor-pointer"
      onClick={onExpandClick}
    >
      <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
        {/* Provider Logo */}
        <div className="col-span-3 flex justify-center items-center">
          <div className="relative w-16 h-8">
            <Image
              src={getProviderLogo()}
              alt={`${provider} Logo`}
              className="object-contain"
              fill
              sizes="64px"
              priority
            />
          </div>
        </div>

        {/* Yes Button */}
        <div className="col-span-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBetClick(market, "YES");
            }}
            className="w-full py-2 px-4 rounded bg-green-50 hover:bg-green-100 
                       transition-colors duration-200 border border-green-100"
          >
            <span className="text-green-700 font-medium">{yesBestPrice}</span>
          </button>
        </div>

        {/* No Button */}
        <div className="col-span-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBetClick(market, "NO");
            }}
            className="w-full py-2 px-4 rounded bg-red-50 hover:bg-red-100 
                       transition-colors duration-200 border border-red-100"
          >
            <span className="text-red-700 font-medium">{noBestPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Main GroupedMarketCard component
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
  const { expandedMarkets } = marketStates;

  const { limitlessMarkets, polymarketMarkets, kalshiMarkets, title } =
    groupedMarket;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 w-full">
      {/* Market Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>

      {/* Market Content */}
      <div className="p-2 space-y-2">
        {/* Market Rows */}
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

        {/* Expanded Market Details */}
        {expandedMarkets.size > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            {[...expandedMarkets].map((marketId) => {
              const market = [
                ...limitlessMarkets,
                ...polymarketMarkets,
                ...kalshiMarkets,
              ].find((m) => m.market.id === marketId)?.market;

              if (!market) return null;

              return (
                <MarketDetailsSection
                  key={marketId}
                  market={market}
                  className="bg-gray-50 rounded-lg mt-2"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupedMarketCard;
