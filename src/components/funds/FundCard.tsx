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
import { formatDate, formatAddress } from '@/utils/formatting';

interface FundCardProps {
  fundAddress: string;
  fundName: string;
  manager: string;
  agent: string;
  targetRaise: bigint;
  minInvestment: bigint;
  entryFee: number;
  carriedInterest: number;
  sourceGroupId?: string;
  sourceGroupName?: string;
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
  sourceGroupId,
  sourceGroupName,
  onInvest,
  onRedeem,
  onViewDetails
}) => {
  const [metrics, setMetrics] = useState<FundMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimatedValue, setEstimatedValue] = useState<{ value: bigint; lastUpdate: Date | undefined } | null>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const fundService = new InvestmentFundService();
        const fundMetrics = await fundService.getFundMetrics(fundAddress as `0x${string}`);
        setMetrics(fundMetrics);
        
        // Fetch estimated value if in trading phase
        if (fundMetrics.currentPhase === FundPhase.TRADING) {
          try {
            const estValue = await fundService.getEstimatedValue(fundAddress as `0x${string}`);
            setEstimatedValue(estValue);
          } catch (err) {
            console.error('Error fetching estimated value:', err);
          }
        }
        
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

  const canInvest = metrics && metrics.currentPhase === FundPhase.DEPOSIT;
  const canRedeem = metrics && metrics.currentPhase === FundPhase.REDEMPTION;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{fundName}</h3>
          {sourceGroupId && sourceGroupName && (
            <div className="mt-1 mb-2">
              <a
                href={`/groups`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {sourceGroupName}
              </a>
            </div>
          )}
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
            
            {metrics.currentPhase === FundPhase.TRADING && (
              <>
                {metrics.tradingEndTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trading Ends:</span>
                    <span className="font-medium">{formatDate(metrics.tradingEndTime)}</span>
                  </div>
                )}
                {estimatedValue && estimatedValue.value > 0n && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimated Value:</span>
                    <span className="font-medium">${weiToUsdc(estimatedValue.value).toLocaleString()} USDC</span>
                  </div>
                )}
                {estimatedValue && estimatedValue.lastUpdate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium text-xs">{formatDate(estimatedValue.lastUpdate)}</span>
                  </div>
                )}
              </>
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