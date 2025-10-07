import React, { useState, useEffect } from 'react';
import { SPMCGroup, SPMCGroupMarket } from '@/services/spmc/types';
import { CreateFundModal } from '@/components/funds/CreateFundModal';
import { useFundMetrics, useFundPhaseDisplay } from '@/hooks/useFundMetrics';
import { FundPhase, weiToUsdc } from '@/services/funds/types';
import { InvestmentFlow } from '@/components/funds/InvestmentFlow';
import { useIndexPriceHistory } from '@/hooks/useSPMCMarkets';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { spmcClient } from '@/services/spmc';

interface IndexCardProps {
  group: SPMCGroup;
  fundAddress?: string | null;
  onInvest?: (groupId: string, allocations: MarketAllocation[]) => void;
  onBuyIndex?: (groupId: string) => void;
  onCreateFund?: (groupId: string) => void;
  onRefreshFund?: () => void;
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

export const IndexCard: React.FC<IndexCardProps> = ({ group, fundAddress, onCreateFund, onRefreshFund }) => {
  const [investmentAmount, setInvestmentAmount] = useState<string>('100');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [showInvestFlow, setShowInvestFlow] = useState(false);
  const [timeRange, setTimeRange] = useState<'1d' | '1w' | 'max'>('1d');
  const [marketsWithPrices, setMarketsWithPrices] = useState<SPMCGroupMarket[]>(group.markets || []);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch fund metrics if fund address exists
  const { metrics: fundMetrics, loading: fundLoading, error: fundError } = useFundMetrics(fundAddress);
  const phaseDisplay = useFundPhaseDisplay(fundMetrics?.currentPhase || null);

  // Fetch index price history
  const { history, loading: historyLoading } = useIndexPriceHistory(group.markets || [], timeRange, group.title);

  // Fetch real-time prices for static calculation
  useEffect(() => {
    const fetchPrices = async () => {
      if (!group.markets || group.markets.length === 0) return;

      setLoadingPrices(true);
      try {
        const marketIds = group.markets.map(m => m.market_id);
        const pricesResponse = await spmcClient.getMarketPrices({ marketIds });

        if (pricesResponse.success && pricesResponse.data?.prices) {
          const pricesMap = pricesResponse.data.prices;

          const updated = group.markets.map((market) => {
            const priceData = pricesMap[market.market_id];
            let currentPrice = market.market_current_price || 0.5;

            if (priceData && priceData.prices) {
              const outcome = market.outcome?.toLowerCase() || 'yes';
              const basePrice = priceData.prices.mid;

              // Invert price for NO outcomes
              currentPrice = outcome === 'no' ? (1 - basePrice) : basePrice;
            }

            return {
              ...market,
              market_current_price: currentPrice
            };
          });

          setMarketsWithPrices(updated);
        }
      } catch (error) {
        console.error('Failed to fetch real-time prices:', error);
        setMarketsWithPrices(group.markets || []);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchPrices();
  }, [group.markets]);

  // Get fund details for investment flow
  const minInvestmentAmount = fundMetrics ? weiToUsdc(BigInt(5 * 10 ** 6)) : 5; // Default 5 USDC
  const entryFee = 100; // Default 1%

  // Calculate index metrics and market percentages using markets with fetched prices
  const totalWeight = marketsWithPrices?.reduce((sum, m) => sum + (m.weight || 1), 0) || 1;

  const marketAllocations = marketsWithPrices?.map((market) => {
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

  // Calculate weighted average price for the index
  const calculateIndexPrice = () => {
    if (!marketsWithPrices || marketsWithPrices.length === 0) return 0;

    const totalWeight = marketsWithPrices.reduce((sum, m) => sum + (m.weight || 1), 0);
    if (totalWeight === 0) return 0;

    const weightedSum = marketsWithPrices.reduce((sum, m) => {
      const price = m.market_current_price || 0;
      const weight = m.weight || 1;
      return sum + (price * weight);
    }, 0);

    return weightedSum / totalWeight;
  };

  const indexPrice = calculateIndexPrice();


  // Determine color based on price sentiment
  const getPriceColorClasses = () => {
    if (indexPrice >= 0.55) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        accent: 'text-green-600'
      };
    } else if (indexPrice <= 0.45) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        accent: 'text-red-600'
      };
    } else {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        accent: 'text-gray-600'
      };
    }
  };

  const priceColors = getPriceColorClasses();

  // Calculate price change in cents
  const priceChange = history.length >= 2
    ? (history[history.length - 1].p - history[0].p) * 100
    : 0;

  // Determine chart color based on trend
  const chartColor = priceChange >= 0 ? '#10b981' : '#ef4444'; // green-500 : red-500
  const changeTextColor = priceChange >= 0 ? 'text-green-600' : 'text-red-600';

  // Simple Moving Average (SMA) filter to smooth data
  const applySMA = (data: typeof history, period: number = 3) => {
    if (data.length < period) return data;

    const smoothed = data.map((point, idx) => {
      // For first few points, use available data
      const start = Math.max(0, idx - Math.floor(period / 2));
      const end = Math.min(data.length, idx + Math.ceil(period / 2));
      const window = data.slice(start, end);

      const avgPrice = window.reduce((sum, p) => sum + p.p, 0) / window.length;

      return {
        t: point.t,
        p: avgPrice
      };
    });

    return smoothed;
  };

  // Apply SMA filter to smooth lumpy data
  const smoothedHistory = applySMA(history, 5);

  // Format time for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    if (timeRange === '1d') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (timeRange === '1w') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-lg">
          <div className="text-xs text-gray-600 mb-1">
            {new Date(data.time * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
          <div className="text-sm font-bold text-gray-900">
            {data.price.toFixed(1)}¢
          </div>
          <div className="text-xs text-gray-500">
            Index Price
          </div>
        </div>
      );
    }
    return null;
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

          {/* Large Index Price Display */}
          <div className={`ml-6 px-6 py-4 ${priceColors.bg} rounded-xl border-2 ${priceColors.border} min-w-[140px]`}>
            <div className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">Index Price</div>
              <div className={`text-4xl font-bold ${priceColors.text} tabular-nums`}>
                {(indexPrice * 100).toFixed(1)}¢
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Weighted Avg
              </div>
            </div>
          </div>
        </div>

        {/* Price History Chart */}
        {!historyLoading && history.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-700">Price History</div>
                <div className="text-xs text-gray-500 mt-1">
                  {timeRange === '1d' ? '24 hours' : timeRange === '1w' ? '7 days' : 'All time'}
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                {(['1d', '1w', 'max'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      timeRange === range
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {range === '1d' ? '24H' : range === '1w' ? '7D' : 'ALL'}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={smoothedHistory.map(point => ({
                    time: point.t,
                    price: point.p * 100
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTime}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    minTickGap={50}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}¢`}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Loading state for chart */}
        {historyLoading && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Fund Status Section - Always Show */}
        <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
          {fundLoading && fundAddress ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ) : fundError ? (
              <div className="text-sm text-red-600">Failed to load fund status</div>
            ) : fundMetrics ? (
              <>
                {/* Fund Phase Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 text-sm font-bold rounded-full border ${phaseDisplay.color}`}>
                      {fundMetrics.currentPhase === FundPhase.DEPOSIT ? '💰 INVEST NOW' : 
                       fundMetrics.currentPhase === FundPhase.TRADING ? '📈 TRADING ACTIVE' :
                       fundMetrics.currentPhase === FundPhase.REDEMPTION ? '💸 WITHDRAW READY' : 
                       '✅ COMPLETED'}
                    </span>
                  </div>
                  {fundMetrics.currentPhase === FundPhase.DEPOSIT && (
                    <div className="text-sm text-gray-600">
                      Closes: {fundMetrics.depositDeadline.toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Fund Progress Bar */}
                {fundMetrics.currentPhase === FundPhase.DEPOSIT && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Funding Progress</span>
                      <span className="font-semibold text-gray-900">
                        ${weiToUsdc(fundMetrics.totalDeposits).toLocaleString()} / ${weiToUsdc(fundMetrics.targetRaise).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(fundMetrics.progressPercentage, 100)}%` }}
                      >
                        {fundMetrics.progressPercentage >= 10 && (
                          <span className="text-[10px] text-white font-bold">
                            {fundMetrics.progressPercentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {fundMetrics.progressPercentage < 100 
                          ? `${(100 - fundMetrics.progressPercentage).toFixed(0)}% remaining`
                          : 'Fully funded!'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Target: ${weiToUsdc(fundMetrics.targetRaise).toLocaleString()} USDC
                      </span>
                    </div>
                  </div>
                )}

                {/* Trading Phase Info */}
                {fundMetrics.currentPhase === FundPhase.TRADING && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-600">Fund is actively trading</span>
                    </div>
                    {fundMetrics.tradingEndTime && (
                      <div className="text-sm text-gray-600">
                        Trading ends: {fundMetrics.tradingEndTime.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Redemption Phase Info */}
                {fundMetrics.currentPhase === FundPhase.REDEMPTION && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-green-600 font-semibold">Ready for withdrawal</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Investors can now redeem shares
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* No Fund Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 text-sm font-bold rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                      👁️ WATCH ONLY
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-gray-700">Available for fund creation</span>
                </div>
              </>
            )}
            
            {/* Manager/Contract Info */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Managed by:</span>
                {fundAddress ? (
                  <a 
                    href={`https://amoy.polygonscan.com/address/${fundAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {fundAddress.slice(0, 6)}...{fundAddress.slice(-4)}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">No contract deployed</span>
                )}
              </div>
            </div>
          </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between mb-4 py-3 px-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs text-gray-700 font-medium">Markets</div>
              <div className="text-lg font-semibold text-gray-900">{group.market_count}</div>
            </div>
          </div>
        </div>

        {/* Two Main Action Options */}
        <div className="space-y-3">
          {/* Fund-based actions when fund exists */}
          {fundAddress && fundMetrics && (
            <>
              {/* Deposit Phase Actions */}
              {fundMetrics.currentPhase === FundPhase.DEPOSIT && (
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Invest in Fund</div>
                      <div className="text-sm text-gray-800">
                        Join {group.market_count} markets through this managed fund
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInvestFlow(true)}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"
                    >
                      Invest Now
                    </button>
                  </div>
                </div>
              )}

              {/* Trading Phase Actions */}
              {fundMetrics.currentPhase === FundPhase.TRADING && (
                <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Fund is Trading</div>
                      <div className="text-sm text-gray-800">
                        Active trading in progress - deposits closed
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/funds/${fundAddress}`}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition whitespace-nowrap"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )}

              {/* Redemption Phase Actions */}
              {fundMetrics.currentPhase === FundPhase.REDEMPTION && (
                <div className="border-2 border-purple-500 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Withdraw Available</div>
                      <div className="text-sm text-gray-800">
                        Redeem your shares and collect returns
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/funds/${fundAddress}`}
                      className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition whitespace-nowrap"
                    >
                      Withdraw Funds
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fallback to original buy index when no fund */}
          {!fundAddress && (
            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Direct Market Investment</div>
                  <div className="text-sm text-gray-800">
                    Calculate allocation across all {group.market_count} markets
                  </div>
                </div>
                <button
                  onClick={() => setShowCalculator(true)}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition whitespace-nowrap"
                >
                  Show Calculator
                </button>
              </div>
            </div>
          )}

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
                {!fundAddress && (
                  <button
                    onClick={() => setShowCreateFund(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Create Fund
                  </button>
                )}
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
      {/* Create Fund Modal */}
      {showCreateFund && (
        <CreateFundModal
          isOpen={showCreateFund}
          onClose={() => setShowCreateFund(false)}
          groupId={group.id}
          groupName={group.title}
          onSuccess={(fundAddress) => {
            console.log('Fund created:', fundAddress);
            setShowCreateFund(false);
            if (onCreateFund) {
              onCreateFund(group.id);
            }
            if (onRefreshFund) {
              onRefreshFund();
            }
          }}
        />
      )}

      {/* Investment Flow Modal */}
      {showInvestFlow && fundAddress && (
        <InvestmentFlow
          fundAddress={fundAddress}
          fundName={group.title}
          minInvestment={BigInt(minInvestmentAmount * 10 ** 6)}
          entryFee={entryFee}
          onCancel={() => setShowInvestFlow(false)}
          onSuccess={(txHash) => {
            console.log('Investment successful:', txHash);
            setShowInvestFlow(false);
            if (onRefreshFund) {
              onRefreshFund();
            }
          }}
        />
      )}
    </div>
  );
};