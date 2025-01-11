// components/LimitlessTest.tsx
import React, { useEffect, useState } from 'react';
import type { Event, SearchParams } from '@/components/types';

// Interface for our component's state
interface MarketState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

const LimitlessTest: React.FC = () => {
  // State management using TypeScript interfaces
  const [state, setState] = useState<MarketState>({
    events: [],
    isLoading: true,
    error: null,
    hasMore: false
  });

  // Function to fetch markets with search parameters
  const fetchMarkets = async (searchParams: SearchParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/limitless/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchParams })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Type checking the response
      if (!Array.isArray(data.events)) {
        throw new Error('Invalid response format');
      }

      setState({
        events: data.events,
        isLoading: false,
        error: null,
        hasMore: data.hasMore
      });

      // Log the first event for debugging
      if (data.events.length > 0) {
        console.log('First event:', data.events[0]);
      }

    } catch (error) {
      console.error('Error fetching markets:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchMarkets({
      searchTerm: '',
      sortBy: 'liquidity',
      sortDirection: 'desc'
    });
  }, []);

  // Render function to display market data
  const renderMarkets = () => {
    if (state.isLoading) {
      return <div className="text-gray-600">Loading markets...</div>;
    }

    if (state.error) {
      return (
        <div className="text-red-600 p-4 bg-red-50 rounded">
          Error: {state.error}
        </div>
      );
    }

    if (state.events.length === 0) {
      return <div className="text-gray-600">No markets found</div>;
    }

    return (
      <div className="space-y-4">
        {state.events.map(event => (
          <div 
            key={event.id} 
            className="p-4 border rounded shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg">{event.title}</h3>
            <p className="text-gray-600">{event.description}</p>
            <div className="mt-2 text-sm">
              <span className="mr-4">
                Liquidity: ${parseFloat(event.markets[0].metrics.liquidity).toFixed(2)}
              </span>
              <span>
                Volume: ${parseFloat(event.markets[0].metrics.volume).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Test controls for manual testing
  const testSearchParams = [
    {
      label: 'High Liquidity',
      params: { sortBy: 'liquidity' as const, sortDirection: 'desc' as const }
    },
    {
      label: 'High Volume',
      params: { sortBy: 'volume' as const, sortDirection: 'desc' as const }
    },
    {
      label: 'Search Crypto',
      params: { searchTerm: 'crypto', sortBy: 'liquidity' as const }
    }
  ];

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Limitless Markets Test</h1>
      
      {/* Test controls */}
      <div className="mb-6 space-x-4">
        {testSearchParams.map(({ label, params }) => (
          <button
            key={label}
            onClick={() => fetchMarkets(params)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                     disabled:bg-blue-300"
            disabled={state.isLoading}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status display */}
      <div className="mb-4 text-sm text-gray-600">
        Total Markets: {state.events.length}
        {state.hasMore && ' (More available)'}
      </div>

      {/* Market display */}
      {renderMarkets()}
    </div>
  );
};

export default LimitlessTest;