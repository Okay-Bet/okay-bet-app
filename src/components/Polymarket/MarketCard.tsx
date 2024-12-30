import React, { useState, useEffect, useMemo } from "react";
import { useMarket } from "../../hooks/useMarket";
import { LoadingState, ErrorState } from "./LoadingState";
import { useBetSlip } from "@/app/context/BetSlipContext";

interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  marketIndices: number[];
  marketSubTitles: string[];
}

interface OrderBook {
  yes: {
    bid?: number;
    ask?: number;
  };
  no: {
    bid?: number;
    ask?: number;
  };
}

const decimalToMoneyline = (decimal: number): string => {
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
};

const formatPrice = (
  price: number | undefined,
  showMoneyline: boolean
): string => {
  if (!price) return "N/A";
  return showMoneyline
    ? decimalToMoneyline(price)
    : `${(price * 100).toFixed(1)}%`;
};

const formatExpiryDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "No expiry date";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.warn("Date parsing error:", e);
    return "Invalid date";
  }
};

export const MarketCard: React.FC<MarketCardProps> = ({
  eventId,
  eventTitle,
  marketIndices,
  marketSubTitles,
}) => {
  const [activeMarketIndex, setActiveMarketIndex] = useState(marketIndices[0]);
  const [showDetails, setShowDetails] = useState(false);
  const [showMoneyline, setShowMoneyline] = useState(false);
  const { addBet } = useBetSlip();

  const { market, loading, error, marketLiquidities } = useMarket(
    eventId,
    activeMarketIndex
  );

  const orderBook = useMemo((): OrderBook => {
    if (!market) return { yes: {}, no: {} };
    
    return {
      yes: {
        bid: market.yesBestBid,
        ask: market.yesBestAsk
      },
      no: {
        bid: market.noBestBid,
        ask: market.noBestAsk
      }
    };
  }, [market]);

  // Sort markets by liquidity
  const sortedData = useMemo(() => {
    return marketIndices
      .map((index, i) => ({
        index,
        subtitle: marketSubTitles[i],
        liquidity: marketLiquidities[i] || 0,
      }))
      .sort((a, b) => b.liquidity - a.liquidity);
  }, [marketIndices, marketSubTitles, marketLiquidities]);

  // Set initial market based on liquidity
  useEffect(() => {
    if (
      marketLiquidities.length > 0 &&
      activeMarketIndex === marketIndices[0]
    ) {
      const highestLiquidityMarket = sortedData[0];
      if (highestLiquidityMarket) {
        setActiveMarketIndex(highestLiquidityMarket.index);
      }
    }
  }, [marketLiquidities, sortedData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!market) return null;

  const handleBetClick = (position: "YES" | "NO") => {
    const price = position === "YES" 
      ? orderBook.yes.ask  // Use ask price when buying YES
      : orderBook.no.ask;  // Use ask price when buying NO
    
    if (!price) return;
  
    const tokenId = position === "YES"
      ? market.tokens.yes.token_id
      : market.tokens.no.token_id;
  
    addBet({
      marketId: market.condition_id,
      eventTitle,
      marketQuestion: market.question,
      position,
      price,
      tokenId,
    });
  };

  return (
    <div className="bg-demo rounded-xl shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary">{eventTitle}</h2>
          <p className="text-sm text-gray-700">
            Expires {formatExpiryDate(market.end_date_iso)}
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
          {sortedData.map(({ index, subtitle }) => (
            <button
              key={index}
              onClick={() => setActiveMarketIndex(index)}
              className={`py-2 px-3 text-sm font-medium transition-colors shrink-0 
                whitespace-normal max-w-[150px] min-h-[48px] 
                ${
                  activeMarketIndex === index
                    ? "bg-black text-white hover:bg-secondary"
                    : "text-primary hover:bg-secondary hover:text-quaternary"
                }`}
            >
              {subtitle}
            </button>
          ))}
        </div>
      </div>

      {/* Price Display */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-primary mb-4">
          {market.question}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* YES Token */}
          <div className="bg-tertiary p-3 rounded-lg">
            <div className="text-sm text-gray-800">Yes Price</div>
            <div className="text-lg font-bold text-font">
              {formatPrice(orderBook.yes.ask, showMoneyline)}
            </div>
          </div>

          {/* NO Token */}
          <div className="bg-tertiary p-3 rounded-lg">
            <div className="text-sm text-gray-800">No Price</div>
            <div className="text-lg font-bold text-font">
              {formatPrice(orderBook.no.ask, showMoneyline)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleBetClick("YES")}
            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!market.active || !orderBook.yes.ask}
          >
            Buy Yes
          </button>
          <button
            onClick={() => handleBetClick("NO")}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!market.active || !orderBook.no.ask}
          >
            Buy No
          </button>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Volume</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${market.volume_num.toLocaleString()}
            </div>
          </div>
          <div className="bg-tertiary p-2 rounded-lg">
            <div className="text-xs text-primary">Liquidity</div>
            <div className="text-sm bold font-medium text-font truncate">
              ${market.liquidity_num.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 text-primary hover:text-gray-500 text-sm"
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

        {showDetails && (
          <div className="mt-6 space-y-6">
            <div>
              <div className="bg-black text-white text-sm font-medium py-2 px-4 rounded-t-lg">
                Description
              </div>
              <div className="bg-tertiary p-4 rounded-b-lg">
                <p className="text-base font-medium leading-relaxed text-gray-200">
                  {market.description || "No description available"}
                </p>
              </div>
            </div>
            <div>
              <div className="bg-black text-white text-sm font-medium py-2 px-4 rounded-t-lg">
                Resolution Rules
              </div>
              <div className="bg-tertiary p-4 rounded-b-lg">
                <p className="text-base font-medium leading-relaxed text-gray-200">
                  {market.resolutionSource ||
                    "Market resolves based on official sources."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
