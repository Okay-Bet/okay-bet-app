// components/Markets/PredictionMarkets.tsx
import React, { useEffect, useState, useCallback } from "react";
import { MarketCard } from "./MarketCard";
import MarketSearch from "./MarketSearch";
import type { Event, SearchParams, MarketProvider } from "@/components/types";

interface MarketState {
  events: Event[];
  loading: boolean;
  error: string | null;
  activeProvider: MarketProvider;
}

const INITIAL_STATE: MarketState = {
  events: [],
  loading: true,
  error: null,
  activeProvider: "LIMITLESS", // You can change the default provider here
};

const PredictionMarkets: React.FC = () => {
  const [state, setState] = useState<MarketState>(INITIAL_STATE);

  // Unified function to fetch markets from any provider
  const fetchMarkets = async (
    provider: MarketProvider,
    searchParams: SearchParams
  ) => {
    const endpoints = {
      POLYMARKET: "/api/polymarket-events",
      LIMITLESS: "/api/limitless/markets",
    };

    try {
      const response = await fetch(endpoints[provider], {
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

      return data;
    } catch (error) {
      throw error;
    }
  };

  const handleSearch = useCallback(
    async (searchParams: SearchParams) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await fetchMarkets(state.activeProvider, searchParams);

        if (Array.isArray(data.events)) {
          setState((prev) => ({
            ...prev,
            events: data.events.filter(
              (event: Event) => event.markets.length > 0
            ),
            loading: false,
            error: null,
          }));
        }
      } catch (error) {
        console.error("Error searching markets:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "An error occurred",
          // Keep existing events on error
          events: prev.events,
        }));
      }
    },
    [state.activeProvider]
  );

  // Function to switch between providers
  const switchProvider = useCallback(
    (provider: MarketProvider) => {
      setState((prev) => ({ ...prev, activeProvider: provider }));
      // Trigger a new search with the current parameters
      handleSearch({
        searchTerm: "",
        sortBy: "liquidity",
        sortDirection: "desc",
      });
    },
    [handleSearch]
  );

  useEffect(() => {
    handleSearch({
      searchTerm: "",
      sortBy: "liquidity",
      sortDirection: "desc",
    });
  }, [handleSearch]);

  return (
    <div className="space-y-4">
      {/* <div className="flex justify-between items-center mb-4">
        <MarketSearch onSearch={handleSearch} isLoading={state.loading} />
        <div className="flex gap-2">
          <button
            onClick={() => switchProvider("LIMITLESS")}
            className={`px-4 py-2 rounded ${
              state.activeProvider === "LIMITLESS"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Limitless
          </button>
          <button
            onClick={() => switchProvider("POLYMARKET")}
            className={`px-4 py-2 rounded ${
              state.activeProvider === "POLYMARKET"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Polymarket
          </button>
        </div>
      </div> */}

      {state.error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {state.error}
        </div>
      )}

      {state.events.length === 0 && !state.loading && !state.error && (
        <div className="text-center py-4 text-gray-500">
          No active markets found
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.events.map((event) => (
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

      {state.loading && (
        <div className="text-center py-4">
          <span className="text-primary">Loading markets...</span>
        </div>
      )}
    </div>
  );
};

export default PredictionMarkets;
