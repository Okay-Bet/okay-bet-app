// app/api/markets/route.ts
import { NextResponse } from "next/server";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

// Type definitions matching Gamma API response
interface GammaMarket {
  id: string;
  question: string;
  description?: string;
  volumeNum?: string;
  liquidityNum?: string;
  resolutionSource?: string;
  endDateIso?: string;
  active?: boolean;
  closed?: boolean;
  conditionId: string;
  clobTokenIds?: string;
  outcomes?: string;
  bestBid?: string;
  bestAsk?: string;
}

interface GammaEvent {
  id: string;
  title: string;
  description?: string;
  markets: GammaMarket[];
  liquidity?: string;
  volume?: string;
}

// Transformed types for frontend
interface TransformedMarket {
  id: string;
  question: string;
  description?: string;
  volume_num: number;
  liquidity_num: number;
  condition_id: string;
  active: boolean;
  closed: boolean;
  end_date_iso: string;
  resolutionSource?: string;
  bestAsk?: number;
  bestBid?: number;
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

// Helper function to safely transform string numbers to numbers
const safeParseFloat = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Transform Gamma market to frontend market
const transformMarket = (market: GammaMarket): TransformedMarket => {
  // Parse token IDs
  let tokenIds: string[] = [];
  try {
    if (market.clobTokenIds) {
      tokenIds = JSON.parse(market.clobTokenIds);
    }
  } catch (e) {
    console.error('Error parsing clobTokenIds:', e);
  }

  return {
    id: market.id,
    question: market.question,
    description: market.description,
    volume_num: safeParseFloat(market.volumeNum),
    liquidity_num: safeParseFloat(market.liquidityNum),
    condition_id: market.conditionId,
    active: market.active ?? false,
    closed: market.closed ?? false,
    end_date_iso: market.endDateIso || new Date().toISOString(),
    resolutionSource: market.resolutionSource,
    bestAsk: safeParseFloat(market.bestAsk),
    bestBid: safeParseFloat(market.bestBid),
    tokens: {
      yes: {
        token_id: tokenIds[0] || '',
        outcome: 'YES'
      },
      no: {
        token_id: tokenIds[1] || '',
        outcome: 'NO'
      }
    }
  };
};

// Transform Gamma event to frontend event
const transformEvent = (event: GammaEvent) => ({
  id: event.id,
  title: event.title,
  description: event.description,
  liquidity: safeParseFloat(event.liquidity),
  volume: safeParseFloat(event.volume),
  markets: event.markets.map(market => ({
    id: market.id,
    question: market.question,
    liquidity: safeParseFloat(market.liquidityNum)
  }))
});

export async function POST(request: Request) {
  try {
    const params = await request.json();

    let url: string;
    if (params.type === "market" && params.eventId) {
      url = `${GAMMA_API_URL}/events?closed=false&id=${params.eventId}`;
    } else {
      url = `${GAMMA_API_URL}/events?closed=false&limit=${params.limit || 10}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (params.type === "market") {
      const event = data[0] as GammaEvent;
      if (!event || !event.markets) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      
      // Transform the event and its markets
      const transformedEvent = {
        ...transformEvent(event),
        markets: event.markets.map(transformMarket)
      };
      
      return NextResponse.json(transformedEvent);
    }

    if (params.type === "topEvents") {
      const transformedEvents = data
        .filter((event: GammaEvent) => event.markets?.length > 0)
        .map(transformEvent)
        .sort((a: any, b: any) => b.liquidity - a.liquidity)
        .slice(0, params.limit || 10);

      return NextResponse.json({ events: transformedEvents });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
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