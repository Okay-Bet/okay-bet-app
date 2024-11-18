// PredictionMarkets.tsx
import React from "react";
import { MarketCard } from "./MarketCard";

const FEATURED_EVENTS = [
  {
    eventId: "10019",
    title: "Pennsylvania Senate Election",
    markets: [
      { index: 0, subTitle: "Democrat" },
      { index: 1, subTitle: "Republican" },
      { index: 2, subTitle: "Other" },
    ],
  },
];

const PredictionMarkets: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-background text-primary rounded-lg">
        <h2 className="text-xl font-bold mb-2">Featured Prediction Markets</h2>
        <p className="text-sm text-primary">
          Showing {FEATURED_EVENTS.length} events
        </p>
      </div>
      {FEATURED_EVENTS.map((event) => (
        <MarketCard
          key={event.eventId}
          eventId={event.eventId}
          eventTitle={event.title}
          marketIndices={event.markets.map((m) => m.index)}
          marketSubTitles={event.markets.map((m) => m.subTitle)}
        />
      ))}
    </div>
  );
};

export default PredictionMarkets;
