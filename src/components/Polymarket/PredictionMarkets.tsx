// components/Polymarket/PredictionMarkets.tsx

import React, { useEffect, useState } from "react";
import { fetchTopLiquidityEvents, Event } from "../../hooks/useMarket";
import { MarketCard } from "./MarketCard";

const PredictionMarkets: React.FC = () => {
  const [topEvents, setTopEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await fetchTopLiquidityEvents(10);
      setTopEvents(events);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="text-primary">Loading top events...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-background text-primary rounded-lg">
        <h2 className="text-xl font-bold mb-2">Top Liquidity Markets</h2>
        <p className="text-sm text-primary">
          Showing the top {topEvents.length} events with the highest liquidity.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topEvents.map((event) => (
          <div key={event.id} className="relative isolate items-start">
            <MarketCard
              eventId={event.id}
              eventTitle={event.title}
              marketIndices={event.markets.map((_, index) => index)}
              marketSubTitles={event.markets.map((market) => market.question)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionMarkets;
