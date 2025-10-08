import React from 'react';
import { FundMetrics, FundPhase, weiToUsdc } from '@/services/funds/types';
import { formatAddress } from '@/utils/formatting';

interface FundStatusSectionProps {
  fundAddress?: string | null;
  fundMetrics: FundMetrics | null;
  fundLoading: boolean;
  fundError: Error | null;
  phaseDisplay: {
    color: string;
    name: string;
    icon: string;
    description: string;
  };
}

/**
 * Displays fund status including phase, progress bar, and contract info
 */
export const FundStatusSection: React.FC<FundStatusSectionProps> = ({
  fundAddress,
  fundMetrics,
  fundLoading,
  fundError,
  phaseDisplay
}) => {
  return (
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
              {formatAddress(fundAddress)}
            </a>
          ) : (
            <span className="text-gray-400 italic">No contract deployed</span>
          )}
        </div>
      </div>
    </div>
  );
};
