// src/components/Markets/PredictionMarkets.tsx
import React, { useEffect } from 'react';
import { useGroupedMarkets } from '@/hooks/useGroupedMarkets';
import { GroupedMarketCard } from './GroupedMarketCard';
import { BetSlip } from '../Bet/BetSlip';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { GroupedMarketCard as GroupedMarketCardType } from '@/components/types';

const LoadingSpinner = () => (
  <div className="text-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
  </div>
);

const MarketGrid = React.memo(({ markets }: { markets: GroupedMarketCardType[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {markets.map((groupedMarket) => (
      <GroupedMarketCard 
        key={groupedMarket.id} 
        groupedMarket={groupedMarket} 
      />
    ))}
  </div>
));

MarketGrid.displayName = 'MarketGrid';

const PredictionMarkets = () => {
  const { 
    groupedMarkets, 
    loading, 
    error,
    hasMore,
    loadMore 
  } = useGroupedMarkets();

  // Debug mount and updates
  useEffect(() => {
    console.log('Markets state:', {
      marketCount: groupedMarkets.length,
      loading,
      error,
      hasMore
    });
  }, [groupedMarkets, loading, error, hasMore]);

  if (loading && groupedMarkets.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <InfiniteScroll
        dataLength={groupedMarkets.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<LoadingSpinner />}
        endMessage={
          <div className="text-center text-gray-500 py-4">
            No more markets to load
          </div>
        }
        scrollThreshold={0.8}
      >
        <MarketGrid markets={groupedMarkets} />
      </InfiniteScroll>
      <BetSlip />
    </div>
  );
};

export default PredictionMarkets;