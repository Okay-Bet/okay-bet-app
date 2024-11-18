// MarketCard.tsx
import React, { useState } from "react";
import { useMarket } from "../../hooks/useMarket";
import { LoadingState, ErrorState } from "./LoadingState";

interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  marketIndices: number[];
  marketSubTitles: string[];
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

  const { market, loading, error } = useMarket(eventId, activeMarketIndex);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!market) return null;

  const yesPrice = market.bestAsk || 0;
  const noPrice = 1 - yesPrice;

  return (
    <div className="bg-demo rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary">{eventTitle}</h2>
          <p className="text-sm text-gray-700">
            Expires {new Date(market.end_date_iso).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              market.active
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {market.active ? "Active" : "Closed"}
          </span>
        </div>
      </div>

      {/* Market Tabs */}
      <div className="border-b border-gray-700 px-4">
        <div className="flex -mb-px">
          {marketIndices.map((index, i) => (
            <button
              key={index}
              onClick={() => setActiveMarketIndex(index)}
              className={`py-2 px-4 text-sm font-medium ${
                activeMarketIndex === index
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-400 hover:text-gray-300"
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
          <h3 className="text-lg font-medium text-primary mb-2">
            {market.question}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-tertiary p-3 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Yes</div>
              <div className="text-lg font-bold text-font">
                {showMoneyline
                  ? `${(yesPrice * 100).toFixed(1)}%`
                  : `$${yesPrice.toFixed(3)}`}
              </div>
            </div>
            <div className="bg-tertiary p-3 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">No</div>
              <div className="text-lg font-bold text-font">
                {showMoneyline
                  ? `${(noPrice * 100).toFixed(1)}%`
                  : `$${noPrice.toFixed(3)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            {
              label: "Volume",
              value: `$${market.volume_num.toLocaleString()}`,
            },
            {
              label: "Liquidity",
              value: `$${market.liquidity_num.toLocaleString()}`,
            },
            { label: "ID", value: market.condition_id.slice(0, 6) },
          ].map((stat, i) => (
            <div key={i} className="bg-tertiary p-2 rounded-lg">
              <div className="text-xs text-gray-400">{stat.label}</div>
              <div className="text-sm font-medium text-font truncate">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            Buy Yes
          </button>
          <button className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
            Buy No
          </button>
        </div>

        {/* Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300 text-sm"
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
              This market tracks the outcome of the Pennsylvania Senate
              election.
            </p>
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Resolution Rules</div>
              <p>
                Market resolves based on Associated Press, Fox News, and NBC
                confirmation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
