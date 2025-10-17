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
  // Always show invest button for demo, regardless of fund state
  return (
    <div className="space-y-3">
      <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900 mb-1">Invest in Fund</div>
            <div className="text-sm text-gray-800">
              Join {group.market_count} markets through this managed fund
            </div>
          </div>
          <button
            disabled
            className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold opacity-60 cursor-not-allowed whitespace-nowrap"
            title="Coming soon"
          >
            Invest Now
          </button>
        </div>
      </div>
    </div>
  );
};
