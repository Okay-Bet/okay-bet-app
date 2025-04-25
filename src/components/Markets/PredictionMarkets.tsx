// components/Markets/PredictionMarkets.tsx
import { useGroupedMarkets } from '@/hooks/useGroupedMarkets';
import { GroupedMarketCard } from './GroupedMarketCard';
import { BetSlip } from '../Bet/BetSlip';
import InfiniteScroll from 'react-infinite-scroll-component';

const PredictionMarkets = () => {
  const { 
    groupedMarkets, 
    loading, 
    error,
    hasMore,
    loadMore 
  } = useGroupedMarkets();

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  }

  return (
    <>
      <InfiniteScroll
        dataLength={groupedMarkets.length}
        next={loadMore}
        hasMore={hasMore}
        loader={
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        }
        endMessage={
          <div className="text-center text-gray-500 py-4">
            No more markets to load
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedMarkets.map((groupedMarket) => (
            <GroupedMarketCard 
              key={groupedMarket.id} 
              groupedMarket={groupedMarket} 
            />
          ))}
        </div>
      </InfiniteScroll>
      <BetSlip />
    </>
  );
};

export default PredictionMarkets;