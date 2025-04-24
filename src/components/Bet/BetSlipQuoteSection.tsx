import React from 'react';
import { OrderQuote } from '../types';

interface BetSlipQuoteSectionProps {
  isQuoting: boolean;
  quote: OrderQuote | null;
}

export const BetSlipQuoteSection: React.FC<BetSlipQuoteSectionProps> = ({
  isQuoting,
  quote
}) => {
  if (isQuoting) {
    return (
      <div className="text-center py-2">
        <span className="text-accent-gray-600">Calculating quote...</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-2">
        <span className="text-accent-gray-600">Enter an amount to see quote</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-accent-gray-600">Position Size</span>
        <span className="font-medium text-black">
          {quote.tokenAmount.toFixed(2)} tokens
        </span>
      </div>
      {/* Add other quote details here */}
    </>
  );
};