// hooks/useMarket.ts
// uses Polymarket gamma api to fetch the market data

import { useState, useEffect } from "react";

export interface Market {
  id: string;
  question: string;
  liquidity_num: number;
  volume_num: number;
  condition_id: string;
  active: boolean;
  closed: boolean;
  enableOrderBook: boolean;
  bestBid: number;
  bestAsk: number;
  end_date_iso: string;
  description?: string;
  resolutionSource?: string;
  outcomes: Array<{
    id: string;
    index: string;
    complement: string;
  }>;
}

export interface MarketData {
  market: Market | null;
  loading: boolean;
  error: string | null;
}

export interface Event {
  id: string;
  title: string;
  liquidity: number;
  volume: number;
  description?: string;
  markets: Array<{
    id: string;
    question: string;
    liquidity: number;
  }>;
}

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export const useMarket = (eventId: string, marketIndex: number): MarketData => {
  const [marketData, setMarketData] = useState<MarketData>({
    market: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(
          `${GAMMA_API_URL}/events?closed=false&id=${eventId}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const event = data[0];

        if (!event || !event.markets || !event.markets[marketIndex]) {
          throw new Error("Market not found");
        }

        const rawMarket = event.markets[marketIndex];

        // Process the market data
        const processedMarket: Market = {
          id: rawMarket.conditionId,
          question: rawMarket.question,
          liquidity_num: Number(rawMarket.liquidityNum || 0),
          volume_num: Number(rawMarket.volumeNum || 0),
          condition_id: rawMarket.conditionId,
          active: rawMarket.active,
          closed: rawMarket.closed,
          enableOrderBook: rawMarket.enableOrderBook,
          bestBid: Number(rawMarket.bestBid || 0),
          bestAsk: Number(rawMarket.bestAsk || 0),
          end_date_iso: rawMarket.endDateIso,
          description: rawMarket.description || undefined,
          resolutionSource: rawMarket.resolutionSource || undefined,
          outcomes: rawMarket.outcomes
            ? JSON.parse(rawMarket.outcomes).map(
                (outcome: string, index: number) => ({
                  id: index.toString(),
                  index: outcome,
                  complement: outcome,
                })
              )
            : [],
        };

        setMarketData({
          market: processedMarket,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Error fetching market data:", err);
        setMarketData({
          market: null,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to fetch market data",
        });
      }
    };

    fetchMarketData();
  }, [eventId, marketIndex]);

  return marketData;
};

// New function to fetch top liquidity events
export const fetchTopLiquidityEvents = async (topN: number = 10): Promise<Event[]> => {
  try {
    const response = await fetch(`${GAMMA_API_URL}/events?closed=false&limit=500`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const events = await response.json();

    // Process and sort events by liquidity
    const processedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title || "Untitled Event",
      liquidity: parseFloat(event.liquidity || 0),
      volume: parseFloat(event.volume || 0),
      description: event.description || "",
      markets: event.markets.map((market: any) => ({
        id: market.id,
        question: market.question || "Untitled Market",
        liquidity: parseFloat(market.liquidity || 0),
      })),
    }));

    // Sort by liquidity and return the top N
    return processedEvents.sort((a:Event, b:Event) => b.liquidity - a.liquidity).slice(0, topN);
  } catch (error) {
    console.error("Error fetching top liquidity events:", error);
    return [];
  }
};
