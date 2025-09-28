import React, { useEffect, useState } from 'react';
import { 
  FundPhase, 
  FundMetrics,
  getPhaseName, 
  getPhaseColor, 
  weiToUsdc,
  basisPointsToPercentage 
} from '@/services/funds/types';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';

interface FundCardProps {
  fundAddress: string;
  fundName: string;
  manager: string;
  agent: string;
  targetRaise: bigint;
  minInvestment: bigint;
  entryFee: number;
  carriedInterest: number;
  onInvest?: () => void;
  onRedeem?: () => void;
  onViewDetails?: () => void;
}

export const FundCard: React.FC<FundCardProps> = ({
  fundAddress,
  fundName,
  manager,
  agent,
  targetRaise,
  minInvestment,
  entryFee,
  carriedInterest,
  onInvest,
  onRedeem,
  onViewDetails
}) => {
  const [metrics, setMetrics] = useState<FundMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const fundService = new InvestmentFundService();
        const fundMetrics = await fundService.getFundMetrics(fundAddress as `0x${string}`);
        setMetrics(fundMetrics);
        setError(null);
      } catch (err) {
        console.error('Error fetching fund metrics:', err);
        setError('Failed to load fund metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fundAddress]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const canInvest = metrics && metrics.currentPhase === FundPhase.DEPOSIT;
  const canRedeem = metrics && metrics.currentPhase === FundPhase.REDEMPTION;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{fundName}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manager: {formatAddress(manager)}
          </p>
          <p className="text-sm text-gray-500">
            Agent: {formatAddress(agent)}
          </p>
        </div>
        {metrics && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(metrics.currentPhase)}`}>
            {getPhaseName(metrics.currentPhase)}
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      ) : metrics && (
        <>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                ${weiToUsdc(metrics.totalDeposits).toLocaleString()} / ${weiToUsdc(targetRaise).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.progressPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.progressPercentage.toFixed(1)}% raised
            </div>
          </div>

          {/* Fund Details */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Min Investment:</span>
              <span className="font-medium">${weiToUsdc(minInvestment)} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Entry Fee:</span>
              <span className="font-medium">{basisPointsToPercentage(entryFee)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Carried Interest:</span>
              <span className="font-medium">{basisPointsToPercentage(carriedInterest)}%</span>
            </div>
            
            {metrics.currentPhase === FundPhase.DEPOSIT && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deposit Deadline:</span>
                <span className="font-medium">{formatDate(metrics.depositDeadline)}</span>
              </div>
            )}
            
            {metrics.currentPhase === FundPhase.TRADING && metrics.tradingEndTime && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Trading Ends:</span>
                <span className="font-medium">{formatDate(metrics.tradingEndTime)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {canInvest && (
              <button
                onClick={onInvest}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Invest
              </button>
            )}
            
            {canRedeem && (
              <button
                onClick={onRedeem}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Redeem
              </button>
            )}
            
            <button
              onClick={onViewDetails}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              View Details
            </button>
          </div>
        </>
      )}
    </div>
  );
};