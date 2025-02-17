import type { PolymarketMarket, MarketStatus } from "@/components/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export interface GammaAPIMarket {
  conditionId: string;
  question: string;
  description?: string;
  resolution_source?: string;
  volume: string;
  liquidity: string;
  end_date_iso: string;
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
  return {
    id: market.conditionId,
    provider: "POLYMARKET",
    question: market.question,
    description: market.description || "",
    status: "Open" as MarketStatus,
    expirationDate: market.end_date_iso,
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
    },
    prices: {
      yes: { bid: undefined, ask: undefined },
      no: { bid: undefined, ask: undefined },
    },
    contract: {
      address: market.conditionId,
      network: "polygon",
    },
    outcomeTokens: {
      yes: market.tokens.yes.token_id,
      no: market.tokens.no.token_id,
    },
  };
};

export async function fetchMarketsByConditionIds(conditionIds: string[]): Promise<PolymarketMarket[]> {
  try {
    const conditionIdsParam = conditionIds.map(id => `condition_ids=${id}`).join('&');
    const url = `${GAMMA_API_URL}/markets?${conditionIdsParam}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Polymarket markets: ${response.status}`);
    }

    const data = await response.json();
    const markets = data.markets || [];
    
    return markets.map(transformMarket);
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    return [];
  }
}

export async function fetchMarketByConditionId(conditionId: string): Promise<PolymarketMarket | null> {
  try {
    const markets = await fetchMarketsByConditionIds([conditionId]);
    return markets[0] || null;
  } catch (error) {
    console.error(`Error fetching market ${conditionId}:`, error);
    return null;
  }
}