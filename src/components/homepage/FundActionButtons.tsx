import React from 'react';
import { FundMetrics, FundPhase } from '@/services/funds/types';
import { SPMCGroup } from '@/services/spmc/types';

interface FundActionButtonsProps {
  fundAddress?: string | null;
  fundMetrics: FundMetrics | null;
  group: SPMCGroup;
  onShowInvestFlow: () => void;
}

/**
 * Phase-specific action buttons for fund operations
 */
export const FundActionButtons: React.FC<FundActionButtonsProps> = ({
  fundAddress,
  fundMetrics,
  group,
  onShowInvestFlow
}) => {
  if (!fundAddress || !fundMetrics) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Deposit Phase Actions */}
      {fundMetrics.currentPhase === FundPhase.DEPOSIT && (
        <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 mb-1">Invest in Fund</div>
              <div className="text-sm text-gray-800">
                Join {group.market_count} markets through this managed fund
              </div>
            </div>
            <button
              onClick={onShowInvestFlow}
              className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"
            >
              Invest Now
            </button>
          </div>
        </div>
      )}

      {/* Trading Phase Actions */}
      {fundMetrics.currentPhase === FundPhase.TRADING && (
        <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 mb-1">Fund is Trading</div>
              <div className="text-sm text-gray-800">
                Active trading in progress - deposits closed
              </div>
            </div>
            <button
              onClick={() => window.location.href = `/funds/${fundAddress}`}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition whitespace-nowrap"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Redemption Phase Actions */}
      {fundMetrics.currentPhase === FundPhase.REDEMPTION && (
        <div className="border-2 border-purple-500 rounded-lg p-4 bg-purple-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 mb-1">Withdraw Available</div>
              <div className="text-sm text-gray-800">
                Redeem your shares and collect returns
              </div>
            </div>
            <button
              onClick={() => window.location.href = `/funds/${fundAddress}`}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition whitespace-nowrap"
            >
              Withdraw Funds
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
