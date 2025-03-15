import type { KalshiMarket, MarketStatus } from "@/components/types";

const KALSHI_API_URL = "https://api.elections.kalshi.com/trade-api/v2";

export interface KalshiAPIMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  rules_primary?: string;
  rules_secondary?: string;
  close_time: string;
  status: string;
  volume_24h: number;
  volume: number;
  open_interest: number;
  liquidity: number;
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  last_price?: number;
  created_time?: string;
  updated_time?: string;
}

export const transformKalshiMarket = (
  market: KalshiAPIMarket
): KalshiMarket => {
  try {
    const status: MarketStatus = (() => {
      switch (market.status.toLowerCase()) {
        case 'active':
          return 'ACTIVE';
        case 'closed':
        case 'settled':
          return 'RESOLVED';
        default:
          return 'ACTIVE';
      }
    })();

    const normalizePrice = (price?: number) => 
      typeof price === 'number' ? price / 100 : undefined;  

    return {
      id: market.ticker,
      provider: "KALSHI",
      question: market.title,
      description: `Rules: ${market.rules_primary || ""}\nAdditional Info: ${
        market.rules_secondary || ""
      }`.trim(),
      ticker: market.ticker,
      category: market.event_ticker,
      status,
      expirationDate: market.close_time,
      timestamps: {
        created: market.created_time || new Date().toISOString(),
        updated: market.updated_time,
      },
      collateral: {
        address: "",
        symbol: "USD",
        decimals: 2,
      },
      metrics: {
        volume: market.volume.toString(),
        volumeRaw: market.volume.toString(),
        liquidity: market.liquidity.toString(),
        liquidityRaw: market.liquidity.toString(),
        openInterest: market.open_interest.toString(),
        openInterestRaw: market.open_interest.toString(),
      },
      prices: {
        yes: {
          bid: normalizePrice(market.yes_bid),
          ask: normalizePrice(market.yes_ask),
        },
        no: {
          bid: normalizePrice(market.no_bid),
          ask: normalizePrice(market.no_ask),
        },
      },
      yesBestAsk: normalizePrice(market.yes_ask),
      noBestAsk: normalizePrice(market.no_ask),
      yesBestBid: normalizePrice(market.yes_bid),
      noBestBid: normalizePrice(market.no_bid),
      contract: {
        address: market.ticker,
        network: "kalshi",
      },
    };
  } catch (error) {
    console.error("Error transforming Kalshi market:", error, market);
    throw error;
  }
};

export async function fetchKalshiMarkets(
  marketIds: string[]
): Promise<KalshiMarket[]> {
  try {
    const headers = {
      accept: "application/json",
      "Content-Type": "application/json",
    };

    const marketPromises = marketIds.map(async (id) => {
      const response = await fetch(`${KALSHI_API_URL}/markets/${id}`, {
        headers,
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch Kalshi market ${id}: ${response.status}`
        );
        return null;
      }

      const data = await response.json();
      return data.market ? transformKalshiMarket(data.market) : null;
    });

    const markets = await Promise.all(marketPromises);
    return markets.filter((market): market is KalshiMarket => market !== null);
  } catch (error) {
    console.error("Error fetching Kalshi markets:", error);
    return [];
  }
}

export async function fetchKalshiMarket(
  marketId: string
): Promise<KalshiMarket | null> {
  try {
    const markets = await fetchKalshiMarkets([marketId]);
    return markets[0] || null;
  } catch (error) {
    console.error(`Error fetching Kalshi market ${marketId}:`, error);
    return null;
  }
}

// Helper function to fetch multiple markets with additional parameters
export const fetchKalshiData = async (
  marketIds: string[]
): Promise<KalshiMarket[]> => {
  try {
    const markets = await fetchKalshiMarkets(marketIds);
    return markets;
  } catch (error) {
    console.error("Error fetching Kalshi data:", error);
    return [];
  }
};
