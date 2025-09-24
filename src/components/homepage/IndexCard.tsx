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
      percentage
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
                See how your investment is distributed across markets
              </div>
              
              {/* Investment Input */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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

              {/* Quick Amount Buttons */}
              <div className="flex gap-1.5">
                {[50, 100, 250, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setInvestmentAmount(amount.toString())}
                    className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded transition"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Breakdown */}
            {showCalculator && marketAllocations.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {marketAllocations.map((allocation) => (
                    <div key={allocation.marketId} className="flex items-center justify-between text-sm">
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-16 text-right font-semibold text-gray-900">
                          {allocation.percentage.toFixed(1)}%
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-900 truncate">
                            {allocation.marketTitle}
                          </div>
                          <div className="text-xs text-gray-700">
                            {allocation.platform} • {allocation.outcome.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${allocation.allocationAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {allocation.expectedShares.toFixed(2)} shares
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Buy Button */}
                <button
                  onClick={handleInvest}
                  className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  Invest ${parseFloat(investmentAmount || '0').toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};