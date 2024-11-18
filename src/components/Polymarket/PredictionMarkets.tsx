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
  {
    eventId: "12795",
    title: "Israel and Hezbollah War", 
    markets: [
      { index: 0, subTitle: "Yes for Peace" },
    ],
  },
  {
    eventId: "10558",
    title: "2024 Hurricane Season",
    markets: [
      { index: 0, subTitle: "<16" },
      { index: 1, subTitle: "16-20" },
      { index: 2, subTitle: "21-25" },
      { index: 3, subTitle: ">25" },
    ],
  },
  {
    eventId: "14532",
    title: "NFL Week 11: Steelers v Browns",
    markets: [
      { index: 0, subTitle: "Yes for Steelers" },
    ],
  },
];

const PredictionMarkets: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-background text-primary rounded-lg">
        <h2 className="text-xl font-bold mb-2">Curated Markets</h2>
        <p className="text-sm text-primary">
          Showing {FEATURED_EVENTS.length} events
        </p>
        <p>Open positions in these markets using USDC on Optimism</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURED_EVENTS.map((event) => (
          <div key={event.eventId} className="relative isolate">
            <MarketCard
              eventId={event.eventId}
              eventTitle={event.title}
              marketIndices={event.markets.map((m) => m.index)}
              marketSubTitles={event.markets.map((m) => m.subTitle)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionMarkets;
