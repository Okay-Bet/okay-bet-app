// components/Polymarket/MarketCard.tsx
import React from 'react';
import { MarketCardProps } from '@/components/types/polymarket';

export const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  return (
    <div className="mb-6 relative">
      <div className="p-6 bg-secondary text-font">
        {/* Market Title */}
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-2xl font-bold break-words flex-1">{market.question}</h4>
          <span className="bg-green-500 text-black px-2 py-1 rounded shadow-lg ml-4">
            {market.active ? 'Active' : 'Closed'}
          </span>
        </div>

        {/* Price Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Market Prices</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">YES</div>
                <div className="text-lg font-bold">
                  ${market.bestAsk?.toFixed(3) || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">NO</div>
                <div className="text-lg font-bold">
                  ${market.bestBid?.toFixed(3) || "N/A"}
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
                  ${Number(market.liquidity_num || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Volume</div>
                <div className="text-lg font-bold">
                  ${Number(market.volume_num || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Expiration</div>
            <div className="text-lg font-bold">
              {market.end_date_iso 
                ? new Date(market.end_date_iso).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : "No expiration set"}
            </div>
          </div>

          <div className="p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Oracle</div>
            <div className="text-xs font-mono break-all">
              {market.oracle || "Unknown Oracle"}
            </div>
          </div>
        </div>

        {/* Market Outcomes */}
        {market.outcomes && market.outcomes.length > 0 && (
          <div className="mt-4 p-4 bg-tertiary rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Possible Outcomes</div>
            <div className="grid grid-cols-2 gap-2">
              {market.outcomes.map((outcome) => (
                <div key={outcome.id} className="p-2 bg-secondary rounded">
                  <div className="text-sm font-medium">Outcome {outcome.index}</div>
                  <div className="text-xs text-gray-400 truncate">
                    ID: {outcome.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};