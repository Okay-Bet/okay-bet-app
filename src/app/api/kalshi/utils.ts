import type { KalshiMarket, MarketStatus } from "@/components/types";

const FASTAPI_URL = "http://157.245.87.57:8000/api/v1/kalshi";

interface KalshiAPIMarket {
  market_id: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  status: string;
  close_time: string;
  volume_24h: number | null;
  volume: number;
  open_interest: number;
  liquidity: number | null;
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  last_price?: number;
  created_time: string;
  updated_time: string;
  ticker: string;
}

interface MarketResponse {
  status: string;
  market: KalshiAPIMarket;
}

async function fetchFastAPIMarketData(marketId: string): Promise<KalshiAPIMarket | null> {
  const url = `${FASTAPI_URL}/markets/${marketId}`;
  console.log(`Fetching Kalshi market from: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`FastAPI error for Kalshi market ${marketId}:`, {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();
    console.log(`Received data for market ${marketId}:`, data);

    if (!data) {
      console.error(`Empty response for market ${marketId}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching Kalshi market ${marketId} from FastAPI:`, {
      error,
      url,
    });
    return null;
  }
}

function mapStatus(status: string): MarketStatus {
  switch (status.toLowerCase()) {
    case 'active':
      return 'ACTIVE';
    case 'closed':
    case 'settled':
      return 'RESOLVED';
    default:
      return 'ACTIVE';
  }
}

function validateMarketData(market: KalshiMarket): boolean {
  return !!(
    market.id &&
    market.question &&
    market.ticker &&
    market.prices?.yes &&
    market.prices?.no
  );
}

const transformMarket = async (marketId: string): Promise<KalshiMarket | null> => {
  try {
    const fastAPIData = await fetchFastAPIMarketData(marketId);

    if (!fastAPIData) {
      console.error(`No data available for Kalshi market ${marketId}`);
      return null;
    }

    console.log(`Transforming market data for ${marketId}:`, fastAPIData);

    const market: KalshiMarket = {
      id: fastAPIData.market_id,
      provider: "KALSHI",
      question: fastAPIData.title,
      description: fastAPIData.subtitle || "",
      ticker: fastAPIData.ticker,
      category: fastAPIData.event_ticker,
      status: mapStatus(fastAPIData.status),
      expirationDate: fastAPIData.close_time,
      timestamps: {
        created: fastAPIData.created_time,
        updated: fastAPIData.updated_time,
      },
      collateral: {
        address: "",
        symbol: "USD",
        decimals: 2,
      },
      metrics: {
        volume: String(fastAPIData.volume || 0),
        volumeRaw: String(fastAPIData.volume || 0),
        liquidity: String(fastAPIData.liquidity || 0),
        liquidityRaw: String(fastAPIData.liquidity || 0),
        openInterest: String(fastAPIData.open_interest || 0),
        openInterestRaw: String(fastAPIData.open_interest || 0),
      },
      prices: {
        yes: {
          bid: fastAPIData.yes_bid ?? undefined,
          ask: fastAPIData.yes_ask ?? undefined,
        },
        no: {
          bid: fastAPIData.no_bid ?? undefined,
          ask: fastAPIData.no_ask ?? undefined,
        },
      },
      yesBestAsk: fastAPIData.yes_ask ?? undefined,
      noBestAsk: fastAPIData.no_ask ?? undefined,
      yesBestBid: fastAPIData.yes_bid ?? undefined,
      noBestBid: fastAPIData.no_bid ?? undefined,
      contract: {
        address: fastAPIData.market_id,
        network: "kalshi",
      },
      openInterest: 0
    };

    if (!validateMarketData(market)) {
      console.error(`Invalid market data for ${marketId}`);
      return null;
    }

    return market;
  } catch (error) {
    console.error(`Error transforming Kalshi market ${marketId}:`, error);
    return null;
  }
};

export async function fetchKalshiMarkets(addresses: string[]): Promise<KalshiMarket[]> {
  try {
    const marketPromises = addresses.map(address => transformMarket(address));
    const markets = await Promise.all(marketPromises);
    
    return markets.filter((market): market is KalshiMarket => 
      market !== null && validateMarketData(market)
    );
  } catch (error) {
    console.error("Error fetching Kalshi markets:", error);
    return [];
  }
}

export async function fetchKalshiMarket(marketId: string): Promise<KalshiMarket | null> {
  try {
    return await transformMarket(marketId);
  } catch (error) {
    console.error(`Error fetching Kalshi market ${marketId}:`, error);
    return null;
  }
}

export const fetchKalshiData = fetchKalshiMarkets;