// components/Markets/PredictionMarkets.tsx
import { useGroupedMarkets } from '@/hooks/useGroupedMarkets';
import { GroupedMarketCard } from './GroupedMarketCard';

const PredictionMarkets = () => {
  const { groupedMarkets, loading, error } = useGroupedMarkets();

  if (loading) {
    return <div className="text-center py-4">Loading markets...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedMarkets.map((groupedMarket) => (
          <GroupedMarketCard 
            key={groupedMarket.id} 
            groupedMarket={groupedMarket} 
          />
        ))}
      </div>
    </div>
  );
};

export default PredictionMarkets;