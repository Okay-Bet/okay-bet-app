// components/Polymarket/PredictionMarkets.tsx
import React, { useEffect, useState } from "react";
import { MarketCard } from "./MarketCard";
import MarketSearch, { SearchParams } from "./MarketSearch";
import { Event } from "../../hooks/useMarket";

const PredictionMarkets: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchParams: SearchParams) => {
    setLoading(true);
    try {
      const response = await fetch("/api/polymarket-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchParams }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setEvents(data.events);
    } catch (error) {
      console.error("Error searching markets:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch({
      searchTerm: "",
      sortBy: "liquidity",
      sortDirection: "desc",
    });
  }, []);

  return (
    <div className="space-y-4">
      <MarketSearch onSearch={handleSearch} isLoading={loading} />
      
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
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

      {loading && (
        <div className="text-center py-4">
          <span className="text-primary">Loading markets...</span>
        </div>
      )}
    </div>
  );
};

export default PredictionMarkets;