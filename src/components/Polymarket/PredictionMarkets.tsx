import React from "react";
import { PredictionMarketsProps } from "../types/polymarket";
import { usePolymarketGraph } from "../../hooks/usePolymarketGraph";
import { MarketCard } from "./MarketCard";
import { LoadingState, ErrorState } from "./LoadingState";

const PredictionMarkets: React.FC<PredictionMarketsProps> = ({
  searchParams = {
    limit: 50,
    active: true,
  },
}) => {
  const { marketData, loading, error } = usePolymarketGraph(searchParams);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (!marketData?.length)
    return (
      <div className="p-6 bg-secondary text-font mb-6">
        <div className="text-gray-300">
          <p>No active markets found</p>
          <p className="text-sm mt-2 text-gray-400">
            Trying to fetch {searchParams.limit} markets from the Polymarket
            subgraph
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary text-font rounded-lg">
        <h2 className="text-xl font-bold mb-2">Active Prediction Markets</h2>
        <p className="text-sm text-gray-300">
          Showing {marketData.length} markets sorted by volume
        </p>
      </div>
      {marketData.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
};

export default PredictionMarkets;
