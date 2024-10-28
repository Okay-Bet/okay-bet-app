// components/Polymarket/MarketCard.tsx
import React from 'react';
import { MarketCardProps } from '@/components/types/polymarket';

export const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  return (
    <div className="mb-6 relative">
      <div className="p-6 bg-secondary text-font">
        <h4 className="text-2xl font-bold break-words">
          {market.question}
        </h4>
        
        <div className="mt-3 text-sm text-right">
          {market.active ? (
            <span className="bg-yellow-500 text-black px-2 py-1 rounded shadow-lg">
              Active Market
            </span>
          ) : (
            <span className="bg-gray-500 text-white px-2 py-1 shadow-lg rounded">
              Closed
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div className="p-4 bg-tertiary text-font shadow-md">
            <span className="text-sm text-gray-300">Current Price</span>
            <div className="text-lg font-bold">
              ${Number(market.current_price || 0).toFixed(3)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span className="text-sm text-gray-300">Volume</span>
              <div className="text-lg font-bold">
                ${Number(market.volume_num || 0).toLocaleString()}
              </div>
            </div>
            
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span className="text-sm text-gray-300">Liquidity</span>
              <div className="text-lg font-bold">
                ${Number(market.liquidity_num || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {market.end_date && (
          <div className="mt-4 p-4 bg-tertiary text-font shadow-md">
            <span className="text-sm text-gray-300">Expires</span>
            <div className="text-lg font-bold">
              {new Date(market.end_date).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};