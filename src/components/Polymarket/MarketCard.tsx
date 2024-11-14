import React from "react";
import { MarketCardProps } from "@/components/types/polymarket";

export const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  // Debug log to see what data we're receiving
  console.log("Market Data:", market);

  return (
    <div className="mb-6 relative">
      <div className="p-6 bg-secondary text-font rounded-lg shadow-lg">
        {/* Market Title */}
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-2xl font-bold break-words flex-1">
            {market.question || `Market ${market.condition_id?.slice(0, 8)}...`}
          </h4>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              market.active
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {market.active ? "Active" : "Closed"}
          </span>
        </div>

        {/* Price Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Market Prices</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Best Ask</div>
                <div className="text-lg font-bold">
                  ${market.bestAsk?.toFixed(3) || "0.000"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Best Bid</div>
                <div className="text-lg font-bold">
                  ${market.bestBid?.toFixed(3) || "0.000"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Market Stats</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Liquidity</div>
                <div className="text-lg font-bold">
                  $
                  {market.liquidity_num?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  }) || "0"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Volume</div>
                <div className="text-lg font-bold">
                  $
                  {market.volume_num?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  }) || "0"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Info */}
        <div className="p-4 bg-tertiary rounded-lg">
          <div className="text-sm text-gray-300 mb-2">Market Info</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Expiration</div>
              <div className="text-sm font-medium">
                {market.end_date_iso
                  ? new Date(market.end_date_iso).toLocaleDateString()
                  : "No expiration set"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Market ID</div>
              <div className="text-sm font-medium truncate">
                {market.condition_id?.slice(0, 8) || "N/A"}...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
