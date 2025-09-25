import React, { useState } from 'react';
import { SPMCGroup } from '@/services/spmc/types';

interface IndexCardProps {
  group: SPMCGroup;
  onInvest?: (groupId: string, allocations: MarketAllocation[]) => void;
  onBuyIndex?: (groupId: string) => void;
}

export interface MarketAllocation {
  marketId: string;
  marketTitle: string;
  platform: string;
  outcome: string;
  weight: number;
  currentPrice: number;
  allocationAmount: number;
  expectedShares: number;
  percentage: number;
  resolutionDate?: string;
}

export const IndexCard: React.FC<IndexCardProps> = ({ group, onInvest, onBuyIndex }) => {
  const [investmentAmount, setInvestmentAmount] = useState<string>('100');
  const [showCalculator, setShowCalculator] = useState(false);

  // Calculate index metrics and market percentages
  const totalWeight = group.markets?.reduce((sum, m) => sum + (m.weight || 1), 0) || 1;
  
  const marketAllocations = group.markets?.map((market) => {
    const weight = market.weight || 1;
    const percentage = (weight / totalWeight) * 100;
    const amount = parseFloat(investmentAmount) || 0;
    const allocationAmount = (amount * weight) / totalWeight;
    
    return {
      marketId: market.market_id,
      marketTitle: market.market_title || market.market_id,
      platform: market.market_platform || 'Unknown',
      outcome: market.outcome || 'yes',
      weight,
      currentPrice: market.market_current_price || 0.5,
      allocationAmount,
      expectedShares: market.market_current_price ? allocationAmount / market.market_current_price : 0,
      percentage,
      resolutionDate: market.market_expiration_date || market.market_close_time || market.market_closes_at
    };
  }) || [];

  const totalValue = group.markets?.reduce((sum, m) => {
    const price = m.market_current_price || 0;
    const weight = m.weight || 1;
    return sum + (price * weight);
  }, 0) || 0;

  // Mock performance data
  const performance24h = ((Math.random() - 0.5) * 20).toFixed(1);
  const isPositive24h = parseFloat(performance24h) >= 0;

  const handleBuyIndex = () => {
    if (onBuyIndex) {
      onBuyIndex(group.id);
    } else {
      alert(`Buying entire ${group.title} index for $${totalValue.toFixed(2)}`);
    }
  };

  const handleInvest = () => {
    if (onInvest) {
      onInvest(group.id, marketAllocations);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">{group.title}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                group.group_type === 'index' 
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {group.group_type === 'index' ? 'INDEX' : 'PORTFOLIO'}
              </span>
            </div>
            <p className="text-sm text-gray-900 line-clamp-2">{group.description}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between mb-4 py-3 px-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-gray-700 font-medium">Markets</div>
              <div className="text-lg font-semibold text-gray-900">{group.market_count}</div>
            </div>
            <div>
              <div className="text-xs text-gray-700 font-medium">Index Price</div>
              <div className="text-lg font-semibold text-gray-900">${totalValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-700 font-medium">24h</div>
              <div className={`text-lg font-semibold flex items-center gap-1 ${
                isPositive24h ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive24h ? '↑' : '↓'}
                {Math.abs(parseFloat(performance24h))}%
              </div>
            </div>
          </div>
        </div>

        {/* Two Main Action Options */}
        <div className="space-y-3">
          {/* Option 1: Buy Entire Index */}
          <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 mb-1">Buy Entire Index</div>
                <div className="text-sm text-gray-800">
                  One-click investment in all {group.market_count} markets
                </div>
              </div>
              <button
                onClick={handleBuyIndex}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition whitespace-nowrap"
              >
                Buy for ${totalValue.toFixed(2)}
              </button>
            </div>
          </div>

          {/* Option 2: Custom Amount with Market Breakdown */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <div className="font-semibold text-gray-900 mb-1">Custom Investment Amount</div>
              <div className="text-sm text-gray-800 mb-3">
                Calculate allocation needed to follow this index with your capital
              </div>
              
              {/* Investment Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 font-medium">$</span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 font-medium"
                    placeholder="100"
                    min="1"
                  />
                </div>
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {showCalculator ? 'Hide' : 'Show'} Breakdown
                </button>
              </div>
            </div>

            {/* Market Breakdown */}
            {showCalculator && marketAllocations.length > 0 && (
              <div className="border-t pt-3 mt-3">
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
                  {marketAllocations.map((allocation) => {
                    // Format resolution date
                    const formatDate = (dateStr?: string) => {
                      if (!dateStr) return 'N/A';
                      const date = new Date(dateStr);
                      if (isNaN(date.getTime())) return 'N/A';
                      const now = new Date();
                      const diffTime = date.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) return 'Closed';
                      if (diffDays === 0) return 'Today';
                      if (diffDays === 1) return 'Tomorrow';
                      if (diffDays <= 7) return `${diffDays} days`;
                      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
                      
                      // Format as MMM DD
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };

                    return (
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
                              {formatDate(allocation.resolutionDate)}
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
                    );
                  })}
                </div>
                
                {/* Summary and Instructions */}
                <div className="border-t border-gray-200 mt-2 pt-4 px-3">
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
                          You would need to allocate the amounts shown above to each market in the index. 
                          This maintains the index weighting and diversification strategy.
                        </p>
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Coming soon:</span> Direct market links and native execution for one-click index investing.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Total across {marketAllocations.length} markets
                    </div>
                    <div className="text-lg font-bold text-primary">
                      ${parseFloat(investmentAmount || '0').toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};