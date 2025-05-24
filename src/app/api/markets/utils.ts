import type { PolymarketMarket, MarketStatus } from "@/components/types";

const FASTAPI_URL = "http://157.245.87.57:8000/api/v1/polymarket";

interface PolymarketAPIMarket {
  conditionId: string;
  question: string;
  description?: string;
  events: {
    id: string;
    slug: string;
    title: string;
  }[];
  resolution_source?: string;
  volume: string;
  liquidity: string;
  endDate: string;
  endDateIso: string;
  clobTokenIds: string;
  outcomePrices: string;
  tokens: {
    yes: {
      token_id: string;
      outcome: string;
    };
    no: {
      token_id: string;
      outcome: string;
    };
  };
}

interface MarketResponse {
  status: string;
  market: PolymarketAPIMarket;
}

async function fetchFastAPIMarketData(marketId: string): Promise<PolymarketAPIMarket | null> {
  try {
    const response = await fetch(`${FASTAPI_URL}/markets/${marketId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`FastAPI error for Polymarket market: ${response.status}`);
      return null;
    }

    const data: MarketResponse = await response.json();
    return data.market;
  } catch (error) {
    console.error(`Error fetching Polymarket market from FastAPI:`, error);
    return null;
  }
}

function validateMarketData(market: PolymarketMarket): boolean {
  return !!(
    market.id &&
    market.question &&
    market.prices?.yes &&
    market.prices?.no
  );
}

const transformMarket = async (marketId: string): Promise<PolymarketMarket | null> => {
  try {
    const fastAPIData = await fetchFastAPIMarketData(marketId);

    if (!fastAPIData) {
      console.error(`No data available for Polymarket market ${marketId}`);
      return null;
    }

    // Parse the JSON strings from FastAPI
    const tokenIds = JSON.parse(fastAPIData.clobTokenIds);
    const prices = JSON.parse(fastAPIData.outcomePrices);

    const market: PolymarketMarket = {
      id: fastAPIData.conditionId,
      provider: "POLYMARKET",
      question: fastAPIData.question,
      description: fastAPIData.description || "",
      slug: fastAPIData.events[0]?.slug || "",
      status: "ACTIVE" as MarketStatus, // You might want to add status to the API response
      expirationDate: fastAPIData.endDateIso,
      timestamps: {
        created: new Date().toISOString(), // Consider adding creation date to API
      },
      collateral: {
        address: "",
        symbol: "USDC",
        decimals: 6,
      },
      metrics: {
        volume: fastAPIData.volume,
        volumeRaw: fastAPIData.volume,
        liquidity: fastAPIData.liquidity,
        liquidityRaw: fastAPIData.liquidity,
        openInterest: "0",
        openInterestRaw: "0",
      },
      prices: {
        yes: {
          bid: parseFloat(prices.yes),
          ask: parseFloat(prices.yes),
        },
        no: {
          bid: parseFloat(prices.no),
          ask: parseFloat(prices.no),
        },
      },
      contract: {
        address: fastAPIData.conditionId,
        network: "polygon",
      },
      outcomeTokens: {
        yes: tokenIds.yes,
        no: tokenIds.no,
      },
    };

    if (!validateMarketData(market)) {
      console.error(`Invalid market data for ${marketId}`);
      return null;
    }

    return market;
  } catch (error) {
    console.error(`Error transforming Polymarket market ${marketId}:`, error);
    return null;
  }
};

export async function fetchPolymarketData(addresses: string[]): Promise<PolymarketMarket[]> {
  try {
    const marketPromises = addresses.map(address => transformMarket(address));
    const markets = await Promise.all(marketPromises);
    
    return markets.filter((market): market is PolymarketMarket => 
      market !== null && validateMarketData(market)
    );
  } catch (error) {
    console.error("Error fetching Polymarket markets:", error);
    return [];
  }
}

// Keep these for backward compatibility if needed
export async function fetchMarketsByConditionIds(
  conditionIds: string[]
): Promise<PolymarketMarket[]> {
  return fetchPolymarketData(conditionIds);
}

export async function fetchMarketByConditionId(
  conditionId: string
): Promise<PolymarketMarket | null> {
  try {
    return await transformMarket(conditionId);
  } catch (error) {
    console.error(`Error fetching market ${conditionId}:`, error);
    return null;
  }
}