import type { PolymarketMarket, MarketStatus } from "@/components/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export interface GammaAPIMarket {
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
  clobTokenIds: string; // This is now a JSON string
  outcomePrices: string; // This is now a JSON string
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

export const transformMarket = (market: GammaAPIMarket): PolymarketMarket => {
  try {
    // Parse the JSON strings
    const tokenIds = JSON.parse(market.clobTokenIds || '[]');
    const prices = JSON.parse(market.outcomePrices || '["0", "0"]');
    const expirationDate = market.endDate || market.endDateIso;


    return {
      id: market.conditionId,
      provider: "POLYMARKET",
      question: market.question,
      description: market.description || "",
      slug: market.events[0]?.slug || "",
      status: "Open" as MarketStatus,
      expirationDate: expirationDate, 
      timestamps: {
        created: new Date().toISOString(),
      },
      collateral: {
        address: "",
        symbol: "USDC",
        decimals: 6,
      },
      metrics: {
        volume: market.volume,
        volumeRaw: market.volume,
        liquidity: market.liquidity,
        liquidityRaw: market.liquidity,
        openInterest: "", // Polymarket doesn't provide open interest
        openInterestRaw: "",
      },
      prices: {
        yes: { 
          bid: parseFloat(prices[0]) || 0, 
          ask: parseFloat(prices[0]) || 0 
        },
        no: { 
          bid: parseFloat(prices[1]) || 0, 
          ask: parseFloat(prices[1]) || 0 
        },
      },
      contract: {
        address: market.conditionId,
        network: "polygon",
      },
      outcomeTokens: {
        yes: tokenIds[0] || "",
        no: tokenIds[1] || "",
      },
    };
  } catch (error) {
    console.error("Error transforming market:", error, market);
    throw error;
  }
};

export async function fetchMarketsByConditionIds(
  conditionIds: string[]
): Promise<PolymarketMarket[]> {
  try {
    const conditionIdsParam = conditionIds
      .map((id) => `condition_ids=${id}`)
      .join("&");
    const url = `${GAMMA_API_URL}/markets?${conditionIdsParam}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Polymarket markets: ${response.status}`);
    }

    const data = await response.json();
    const markets = data.markets || [];

    return markets.map(transformMarket);
  } catch (error) {
    console.error("Error fetching Polymarket markets:", error);
    return [];
  }
}

export async function fetchMarketByConditionId(
  conditionId: string
): Promise<PolymarketMarket | null> {
  try {
    const markets = await fetchMarketsByConditionIds([conditionId]);
    return markets[0] || null;
  } catch (error) {
    console.error(`Error fetching market ${conditionId}:`, error);
    return null;
  }
}

export const fetchPolymarketData = async (
  conditionIds: string[],
): Promise<PolymarketMarket[]> => {
  try {
    const conditionIdsParam = conditionIds
      .map((id) => `condition_ids=${id}`)
      .join("&");
    const url = `${GAMMA_API_URL}/markets?${conditionIdsParam}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Polymarket API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        conditionIds,
      });
      throw new Error(
        `Failed to fetch Polymarket data: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    // Check if data exists and is in the expected format
    if (!data || !Array.isArray(data)) {
      console.error("Unexpected API response structure:", data);
      return [];
    }

    // Safely map over the data
    const transformedMarkets = data
      .map((market) => {
        try {
          return transformMarket(market);
        } catch (error) {
          console.error(`Error transforming market:`, error, market);
          return null;
        }
      })
      .filter((market): market is PolymarketMarket => market !== null);

    return transformedMarkets;
  } catch (error) {
    console.error("Error fetching Polymarket data:", error);
    return [];
  }
};
