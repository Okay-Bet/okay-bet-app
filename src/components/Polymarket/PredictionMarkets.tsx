// components/Polymarket/PredictionMarkets.tsx
import React, { useEffect, useState, useCallback } from "react";
import { MarketCard } from "./MarketCard";
import MarketSearch from "./MarketSearch";
import { Event } from "../types/market";
import { SearchParams } from "../types/market";

const PredictionMarkets: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchParams: SearchParams) => {
    setLoading(true);
    try {
      const response = await fetch("/api/polymarket-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchParams }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Only set events if we have valid data
      if (Array.isArray(data.events)) {
        setEvents(data.events.filter((event: Event) => event.markets.length > 0));
      }
      
      setError(null);
    } catch (error) {
      console.error("Error searching markets:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      // Keep existing data on error
      setEvents(prev => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleSearch({
      searchTerm: "",
      sortBy: "liquidity",
      sortDirection: "desc",
    });
  }, [handleSearch]);

  return (
    <div className="space-y-4">
      <MarketSearch onSearch={handleSearch} isLoading={loading} />
      
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {events.length === 0 && !loading && !error && (
        <div className="text-center py-4 text-gray-500">
          No active markets found
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <div key={event.id} className="relative isolate items-start">
            <MarketCard
              eventId={event.id}
              eventTitle={event.title}
              markets={event.markets}
              key={`${event.id}-${event.markets.length}`}
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