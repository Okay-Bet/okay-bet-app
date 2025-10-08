import React from 'react';
import { MarketAllocation } from './IndexCard';
import { formatResolutionDate } from '@/utils/formatting';

interface MarketAllocationTableProps {
  marketAllocations: MarketAllocation[];
  investmentAmount: string;
}

/**
 * Table showing market-by-market allocation breakdown
 */
export const MarketAllocationTable: React.FC<MarketAllocationTableProps> = ({
  marketAllocations,
  investmentAmount
}) => {
  if (marketAllocations.length === 0) {
    return null;
  }

  return (
    <div className="border-t pt-3 mt-3">
      {/* Summary and Instructions - Above Table */}
      <div className="mb-4 px-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold text-gray-900 mb-1">
                To follow this index with ${parseFloat(investmentAmount || '0').toFixed(2)}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                You would need to allocate the amounts shown below to each market in the index.
                This maintains the index weighting and diversification strategy.
              </p>
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Coming soon:</span> Direct market links and native execution for one-click index investing.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
        <div className="col-span-4">Market Question</div>
        <div className="col-span-1 text-center">Side</div>
        <div className="col-span-2 text-center">Resolution</div>
        <div className="col-span-1 text-center">Weight</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Allocation</div>
      </div>

      {/* Market Rows */}
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {marketAllocations.map((allocation) => (
          <div key={allocation.marketId} className="grid grid-cols-12 gap-3 px-3 py-3 hover:bg-gray-50 transition-colors group">
            {/* Market Question */}
            <div className="col-span-4">
              <div className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {allocation.marketTitle}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span className="inline-flex items-center">
                  <span className="capitalize">{allocation.platform.toLowerCase()}</span>
                </span>
              </div>
            </div>

            {/* Outcome (Yes/No) */}
            <div className="col-span-1 flex items-center justify-center">
              <span className={`px-2 py-1 text-xs font-bold rounded ${
                allocation.outcome.toLowerCase() === 'yes'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {allocation.outcome.toUpperCase()}
              </span>
            </div>

            {/* Resolution Date */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {formatResolutionDate(allocation.resolutionDate)}
                </div>
                {allocation.resolutionDate && (
                  <div className="text-xs text-gray-500">
                    {new Date(allocation.resolutionDate).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Index Weighting */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-gray-900">
                  {allocation.percentage.toFixed(0)}%
                </span>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${allocation.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Price */}
            <div className="col-span-2 flex flex-col items-end justify-center">
              <div className="text-sm font-bold text-gray-900">
                {(allocation.currentPrice * 100).toFixed(1)}¢
              </div>
              <div className="text-xs text-gray-500">
                per share
              </div>
            </div>

            {/* Allocation Amount */}
            <div className="col-span-2 flex flex-col items-end justify-center">
              <div className="text-sm font-bold text-primary">
                ${allocation.allocationAmount.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">
                ≈ {allocation.expectedShares.toFixed(1)} shares
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary Below Table */}
      <div className="border-t border-gray-200 mt-2 pt-4 px-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total across {marketAllocations.length} markets
          </div>
          <div className="text-lg font-bold text-primary">
            ${parseFloat(investmentAmount || '0').toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
