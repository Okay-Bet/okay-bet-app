import React, { useState } from 'react';
import { SPMCGroup } from '@/services/spmc/types';
import { CreateFundModal } from '@/components/funds/CreateFundModal';
import { useFundMetrics, useFundPhaseDisplay } from '@/hooks/useFundMetrics';
import { weiToUsdc } from '@/services/funds/types';
import { InvestmentFlow } from '@/components/funds/InvestmentFlow';
import { useIndexPriceHistory } from '@/hooks/useSPMCMarkets';
import { useIndexCardData } from '@/hooks/useIndexCardData';
import { IndexCardHeader } from './IndexCardHeader';
import { IndexPriceChart } from './IndexPriceChart';
import { FundStatusSection } from './FundStatusSection';
import { FundActionButtons } from './FundActionButtons';
import { InvestmentCalculator } from './InvestmentCalculator';
import { MarketAllocationTable } from './MarketAllocationTable';

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
  const [timeRange, setTimeRange] = useState<'1d' | '1w' | 'max'>('1w');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch fund metrics if fund address exists
  const { metrics: fundMetrics, loading: fundLoading, error: fundError } = useFundMetrics(fundAddress);
  const phaseDisplay = useFundPhaseDisplay(fundMetrics?.currentPhase || null);

  // Fetch index price history - only when expanded
  // Uses new server-side aggregated endpoint for 10x performance improvement
  const { history, loading: historyLoading } = useIndexPriceHistory(group.id, timeRange, isExpanded);

  // Get calculated data from hook
  const { indexPrice, priceColors, marketAllocations } = useIndexCardData({
    group,
    investmentAmount
  });

  // Get fund details for investment flow
  const minInvestmentAmount = fundMetrics ? weiToUsdc(BigInt(5 * 10 ** 6)) : 5; // Default 5 USDC
  const entryFee = 100; // Default 1%

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
      <div className="p-6">
        {/* Card Header */}
        <IndexCardHeader
          group={group}
          indexPrice={indexPrice}
          priceColors={priceColors}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        {/* Price History Chart - Only render when expanded */}
        {isExpanded && (
          <IndexPriceChart
            history={history}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            loading={historyLoading}
          />
        )}

        {/* Fund Status Section */}
        <FundStatusSection
          fundAddress={fundAddress}
          fundMetrics={fundMetrics}
          fundLoading={fundLoading}
          fundError={fundError}
          phaseDisplay={phaseDisplay}
        />

        {/* Fund Action Buttons */}
        <FundActionButtons
          fundAddress={fundAddress}
          fundMetrics={fundMetrics}
          group={group}
          onShowInvestFlow={() => setShowInvestFlow(true)}
        />

        {/* Investment Calculator & Market Breakdown */}
        <div className="space-y-3">
          <InvestmentCalculator
            investmentAmount={investmentAmount}
            setInvestmentAmount={setInvestmentAmount}
            showCalculator={showCalculator}
            setShowCalculator={setShowCalculator}
            fundAddress={fundAddress}
          />

          {showCalculator && (
            <MarketAllocationTable
              marketAllocations={marketAllocations}
              investmentAmount={investmentAmount}
            />
          )}
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