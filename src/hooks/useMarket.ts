import { useState, useEffect } from "react";

// Token interfaces
interface TokenPair {
  token_id: string;
  outcome: string;
}

// Market interfaces
export interface Market {
  id: string; // condition id
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
  min_size?: string;
  min_tick_size?: string;
  tokens: {
    yes: TokenPair;
    no: TokenPair;
  };
  outcomes: Array<{
    id: string;
    index: string;
    complement: string;
  }>;
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

export interface MarketData {
  market: Market | null;
  loading: boolean;
  error: string | null;
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
        let tokenIds: string[] = [];
        try {
          if (rawMarket.clobTokenIds) {
            tokenIds = JSON.parse(rawMarket.clobTokenIds);
          }
        } catch (e) {
          console.error("Error parsing clobTokenIds:", e);
        }

        // Map token IDs to YES/NO
        const tokens = {
          yes: {
            token_id: tokenIds[0] || "",
            outcome: "YES",
          },
          no: {
            token_id: tokenIds[1] || "",
            outcome: "NO",
          },
        };


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
          min_size: rawMarket.minimum_order_size,
          min_tick_size: rawMarket.minimum_tick_size,
          tokens,
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

// Maintain the fetchTopLiquidityEvents function for PredictionMarkets component
export const fetchTopLiquidityEvents = async (
  topN: number = 10
): Promise<Event[]> => {
  try {
    const response = await fetch(
      `${GAMMA_API_URL}/events?closed=false&limit=500`
    );
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
    return processedEvents
      .sort((a: Event, b: Event) => b.liquidity - a.liquidity)
      .slice(0, topN);
  } catch (error) {
    console.error("Error fetching top liquidity events:", error);
    return [];
  }
};
