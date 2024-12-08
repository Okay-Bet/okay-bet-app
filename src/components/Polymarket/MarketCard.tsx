// components/Polymarket/MarketCard.tsx
// renders a single poly market and lets users interact with it

import React, { useState } from "react";
import { useMarket } from "../../hooks/useMarket";
import { LoadingState, ErrorState } from "./LoadingState";
import { useBetSlip } from "@/app/context/BetSlipContext";

const decimalToMoneyline = (decimal: number): string => {
  if (decimal >= 1) return "0";
  if (decimal <= 0.5) {
    return `+${Math.round(100 / decimal - 100)}`;
  } else {
    return `-${Math.round(100 / (1 - decimal) - 100)}`;
  }
};

interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  marketIndices: number[];
  marketSubTitles: string[];
}

interface Market {
  end_date_iso: string;
  condition_id: string;
  question: string;
  description?: string;
  resolutionSource?: string;
  volume_num: number;
  liquidity_num: number;
  bestAsk?: number;
  active?: boolean;
  tokens: {
    yes: {
      token_id: string;
      outcome: string;
    };
    no: {
      token_id: string;
      outcome: string;
    };
  };
}

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

  const { market, loading, error } = useMarket(eventId, activeMarketIndex);

  const formatExpiryDate = (dateStr: string | undefined) => {
    if (!dateStr) return "No expiry date";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  };

  const renderPrice = (price: number) => {
    if (showMoneyline) {
      return decimalToMoneyline(price);
    }
    return `${(price * 100).toFixed(1)}%`;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!market) return null;

  const yesPrice = market.bestAsk || 0;
  const noPrice = 1 - yesPrice;

  return (
    <div className="bg-demo rounded-xl shadow-lg overflow-hidden">
      {/* Header section */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary">{eventTitle}</h2>
          <p className="text-sm text-gray-700">
            Expires {formatExpiryDate(market.end_date_iso)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMoneyline(!showMoneyline)}
            className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-full transition-colors"
          >
            {showMoneyline ? "Show %" : "Show ML"}
          </button>
        </div>
      </div>

      {/* Market Tabs section */}
      <div className="border-b border-gray-700 px-4">
        <div className="flex mb-px">
          {marketIndices.map((index, i) => (
            <button
              key={index}
              onClick={() => setActiveMarketIndex(index)}
              className={`py-2 px-4 text-sm font-medium ${
                activeMarketIndex === index
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-800 hover:text-gray-500"
              }`}
            >
              {marketSubTitles[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-primary mb-2 items-start">
            {market.question}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-tertiary p-3 rounded-lg">
              <div className="text-sm text-gray-800 mb-1">Yes</div>
              <div className="text-lg font-bold text-font">
                {renderPrice(yesPrice)}
              </div>
            </div>
            <div className="bg-tertiary p-3 rounded-lg">
              <div className="text-sm text-gray-800 mb-1">No</div>
              <div className="text-lg font-bold text-font">
                {renderPrice(noPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            onClick={() => {
              addBet({
                marketId: market.condition_id,
                eventTitle: eventTitle,
                marketQuestion: market.question,
                position: "YES",
                price: yesPrice,
                tokenId: market.tokens.yes.token_id,
              });
            }}
            className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Buy Yes
          </button>
          <button
            onClick={() =>
              addBet({
                marketId: market.condition_id,
                eventTitle: eventTitle,
                marketQuestion: market.question,
                position: "NO",
                price: noPrice,
                tokenId: market.tokens.no.token_id,
              })
            }
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Buy No
          </button>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            {
              label: "Volume",
              value: `$${market.volume_num.toLocaleString()}`,
            },
            {
              label: "Liquidity",
              value: `$${market.liquidity_num.toLocaleString()}`,
            },
          ].map((stat, i) => (
            <div key={i} className="bg-tertiary p-2 rounded-lg">
              <div className="text-xs text-primary">{stat.label}</div>
              <div className="text-sm bold font-medium text-font truncate">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-primary hover:text-gray-500 text-sm"
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
          <div className="mt-4 p-4 bg-tertiary rounded-lg text-sm text-gray-300">
            <p className="mb-3">
              {market.description || "No description available"}
            </p>{" "}
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Resolution Rules</div>
              <p>
                {market.resolutionSource ||
                  "Market resolves based on official sources."}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">
                  Trading Information
                </div>
                <ul className="space-y-1">
                  <li>• Total Volume: ${market.volume_num.toLocaleString()}</li>
                  <li>
                    • Total Liquidity: ${market.liquidity_num.toLocaleString()}
                  </li>
                  <li>• Market ID: {market.condition_id}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
