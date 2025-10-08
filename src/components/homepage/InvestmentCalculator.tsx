import React from 'react';

interface InvestmentCalculatorProps {
  investmentAmount: string;
  setInvestmentAmount: (amount: string) => void;
  showCalculator: boolean;
  setShowCalculator: (show: boolean) => void;
  fundAddress?: string | null;
}

/**
 * Investment amount input and calculator toggle
 */
export const InvestmentCalculator: React.FC<InvestmentCalculatorProps> = ({
  investmentAmount,
  setInvestmentAmount,
  showCalculator,
  setShowCalculator,
  fundAddress
}) => {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <div className="font-semibold text-gray-900 mb-1">Custom Investment Amount</div>
        <div className="text-sm text-gray-800 mb-3">
          Calculate allocation needed to follow this index with your capital
        </div>

        {/* Investment Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 w-full">
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
            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
          >
            {showCalculator ? 'Hide' : 'Show'} Breakdown
          </button>
          {!fundAddress && (
            <button
              disabled
              className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed border border-gray-300 whitespace-nowrap"
            >
              Create Fund
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
