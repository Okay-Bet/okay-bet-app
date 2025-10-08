'use client';

import React from 'react';
import { useIndexPrice } from '@/hooks/useIndexPriceHistory';

interface IndexPriceDisplayProps {
  groupId: string;
  showMarketBreakdown?: boolean;
}

/**
 * Display component for index prices with market breakdown
 * Supports all platforms via SPMC batch pricing
 */
export function IndexPriceDisplay({
  groupId,
  showMarketBreakdown = false
}: IndexPriceDisplayProps) {
  const { data, loading, error } = useIndexPrice(groupId);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error loading index price: {error}
      </div>
    );
  }

  if (!data || data.currentPrice === null) {
    return (
      <div className="text-gray-500 text-sm">
        No price data available
      </div>
    );
  }

  const pricePercentage = (data.currentPrice * 100).toFixed(1);
  const priceColor = data.currentPrice >= 0.5 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Current Price */}
      <div>
        <div className={`text-3xl font-bold ${priceColor}`}>
          {pricePercentage}¢
        </div>
        <div className="text-sm text-gray-500">
          Index Price • {data.validMarketsCount}/{data.totalMarketsCount} markets
        </div>
        {data.warning && (
          <div className="text-xs text-yellow-600 mt-1">
            {data.warning}
          </div>
        )}
      </div>

      {/* Market Breakdown */}
      {showMarketBreakdown && data.markets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Market Breakdown</h4>
          <div className="space-y-1">
            {data.markets.map((market) => {
              const weightPercentage = ((market.weight / data.totalWeight) * 100).toFixed(1);
              const price = market.currentPrice !== null
                ? (market.currentPrice * 100).toFixed(1)
                : 'N/A';

              return (
                <div
                  key={market.id}
                  className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-400">
                      {market.platform.toUpperCase()}
                    </span>
                    <span className="text-gray-600">
                      {market.outcome ? `${market.outcome.toUpperCase()}` : 'YES'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">
                      Weight: {weightPercentage}%
                    </span>
                    <span className={market.currentPrice !== null ? 'font-semibold' : 'text-gray-400'}>
                      {price}¢
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-400">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
