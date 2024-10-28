// components/Polymarket/PredictionMarkets.tsx
import React from 'react';
import { PredictionMarketsProps } from '@/components/types/polymarket';
import { usePolymarket } from '../../hooks/usePolymarket';
import { MarketCard } from './MarketCard';
import { LoadingState, ErrorState } from './LoadingState';

const PredictionMarkets: React.FC<PredictionMarketsProps> = ({ 
  // Use more general parameters since we see various types of markets
  searchParams = { 
    active: true,
    limit: 10 // Limit to 10 markets
  } 
}) => {
  const { marketData, loading, error } = usePolymarket(searchParams);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!marketData?.length) return (
    <div className="p-6 bg-secondary text-font mb-6">
      <div className="text-gray-300">No markets found</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {marketData.map((market) => (
        <MarketCard key={market.id || market.conditionId} market={market} />
      ))}
    </div>
  );
};

export default PredictionMarkets;