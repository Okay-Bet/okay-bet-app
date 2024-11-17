// PredictionMarkets.tsx
import React from "react";
import { MarketCard } from "./MarketCard";

// Define market configuration
const FEATURED_MARKETS = [
  {
    eventId: "10019",
    marketIndex: 0,
    title: "Pennsylvania Senate Election - Democrat",
  },
  {
    eventId: "10019",
    marketIndex: 1,
    title: "Pennsylvania Senate Election - Republican",
  },
  {
    eventId: "10019",
    marketIndex: 2,
    title: "Pennsylvania Senate Election - Other",
  },
  // Add more markets as needed
];

const PredictionMarkets: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary text-font rounded-lg">
        <h2 className="text-xl font-bold mb-2">Featured Prediction Markets</h2>
        <p className="text-sm text-gray-300">
          Showing {FEATURED_MARKETS.length} curated markets
        </p>
      </div>

      {FEATURED_MARKETS.map((market, index) => (
        <MarketCard
          key={`${market.eventId}-${market.marketIndex}`}
          eventId={market.eventId}
          marketIndex={market.marketIndex}
        />
      ))}
    </div>
  );
};

export default PredictionMarkets;
