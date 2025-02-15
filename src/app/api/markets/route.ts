import { NextResponse } from "next/server";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

interface ApiRequest {
  type: "polymarketByIds";
  conditionIds: string[];
}

interface GammaMarket {
  conditionId: string; // Note: changed from condition_id to match actual API
  question: string;
  resolutionSource?: string; // Note: changed from resolution_source
  endDate: string; // Note: changed from end_date_iso
  liquidity: string;
  volume: string;
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

interface TransformedMarket {
  conditionId: string;
  question: string;
  description?: string;
  endDate: string;
  volume_num: number;
  liquidity_num: number;
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

const safeParseFloat = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const transformMarket = (market: GammaMarket): TransformedMarket => {
  return {
    conditionId: market.conditionId,
    question: market.question,
    description: market.resolutionSource,
    endDate: market.endDate,
    volume_num: safeParseFloat(market.volume),
    liquidity_num: safeParseFloat(market.liquidity),
    tokens: market.tokens,
  };
};

const fetchPolymarketsByConditionIds = async (conditionIds: string[]): Promise<GammaMarket[]> => {
  const markets: GammaMarket[] = [];
  
  // Build query with condition_ids parameter
  const conditionIdsQuery = conditionIds.map(id => `condition_ids=${id}`).join('&');
  const url = `${GAMMA_API_URL}/markets?${conditionIdsQuery}`;
  
  console.log(`Fetching markets from: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data && Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.markets)) {
      return data.markets;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
};

export async function POST(request: Request) {
  try {
    const params: ApiRequest = await request.json();

    if (!params.conditionIds || params.conditionIds.length === 0) {
      return NextResponse.json(
        { error: "Condition IDs are required" },
        { status: 400 }
      );
    }

    const markets = await fetchPolymarketsByConditionIds(params.conditionIds);

    if (markets.length === 0) {
      return NextResponse.json({
        markets: [],
        total: 0,
        message: "No markets found for the provided condition IDs",
      });
    }

    const transformedMarkets = markets.map(transformMarket);

    return NextResponse.json({
      markets: transformedMarkets,
      total: transformedMarkets.length,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
