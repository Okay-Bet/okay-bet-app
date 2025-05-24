import React, { useCallback } from "react";
import { useGroupedMarkets } from "@/hooks/useGroupedMarkets";
import { GroupedMarketCard } from "./GroupedMarketCard";
import { BetSlip } from "../Bet/BetSlip";
import type { GroupedMarketCard as GroupedMarketCardType } from "@/components/types";

const LoadingSpinner = () => (
  <div className="text-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
  </div>
);

const MarketGrid = React.memo(
  ({ markets }: { markets: GroupedMarketCardType[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((groupedMarket) => (
        <GroupedMarketCard
          key={groupedMarket.id}
          groupedMarket={groupedMarket}
        />
      ))}
    </div>
  )
);

MarketGrid.displayName = "MarketGrid";

const PredictionMarkets = () => {
  const { groupedMarkets, loading, error, hasMore, loadMore, page } = useGroupedMarkets();

  if (error) {
    return (
      <div className="text-center text-red-500 py-4">
        Error loading markets: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <MarketGrid markets={groupedMarkets} />
      
      <div className="flex justify-center gap-4 my-6">
        {page > 1 && (
          <button
            onClick={() => loadMore(page - 1)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={loading}
          >
            Previous
          </button>
        )}
        
        <span className="px-4 py-2">
          Page {page}
        </span>

        {hasMore && (
          <button
            onClick={() => loadMore(page + 1)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={loading}
          >
            Next
          </button>
        )}
        
        {loading && <LoadingSpinner />}
      </div>
      
      <BetSlip />
    </div>
  );
};

// Ensure component is properly memoized
export default React.memo(PredictionMarkets);