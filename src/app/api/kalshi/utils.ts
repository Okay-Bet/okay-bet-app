import type { KalshiMarket, MarketStatus } from "@/components/types";

const KALSHI_API_URL = "https://trading-api.kalshi.com/v1";

export interface KalshiAPIMarket {
  ticker: string;
  title: string;
  category: string;
  sub_category?: string;
  description?: string;
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
  created_time: string;
  updated_time?: string;
}

export const transformKalshiMarket = (market: KalshiAPIMarket): KalshiMarket => {
  try {
    const status: MarketStatus = (() => {
      switch (market.status.toLowerCase()) {
        case 'active':
          return 'Open';
        case 'closed':
          return 'Closed';
        case 'settled':
          return 'Resolved';
        default:
          return 'Open';
      }
    })();

    return {
      id: market.ticker,
      provider: "KALSHI",
      question: market.title,
      description: market.description || "",
      ticker: market.ticker,
      category: market.category,
      status,
      expirationDate: market.close_time,
      timestamps: {
        created: market.created_time,
        updated: market.updated_time,
      },
      collateral: {
        address: "", // Kalshi uses USD directly
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
          bid: market.yes_bid,
          ask: market.yes_ask,
        },
        no: {
          bid: market.no_bid,
          ask: market.no_ask,
        },
      },
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
    // Kalshi API might require authentication
    const headers = {
      'Content-Type': 'application/json',
      // Add any required API keys or authentication headers
    };

    // Fetch markets in parallel if needed
    const marketPromises = marketIds.map(async (id) => {
      const response = await fetch(`${KALSHI_API_URL}/markets/${id}`, {
        headers,
      });

      if (!response.ok) {
        console.error(`Failed to fetch Kalshi market ${id}: ${response.status}`);
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
  marketIds: string[],
): Promise<KalshiMarket[]> => {
  try {
    const markets = await fetchKalshiMarkets(marketIds);
    return markets;
  } catch (error) {
    console.error("Error fetching Kalshi data:", error);
    return [];
  }
};