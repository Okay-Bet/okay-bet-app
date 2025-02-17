import { NextResponse } from "next/server";
import type { PolymarketMarket, MarketStatus } from "@/components/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";


interface GammaAPIMarket {
  id: string;
  conditionId: string;
  question: string;
  description?: string;
  resolutionSource?: string;
  liquidity: string;
  volume: string;
  endDate: string;
  volumeNum: number;
  liquidityNum: number;
  clobTokenIds: string; 
  outcomePrices: string;
  bestBid?: string;
  bestAsk?: string;
}

const transformMarket = (market: GammaAPIMarket): PolymarketMarket => {
  const tokenIds = JSON.parse(market.clobTokenIds);
  const prices = JSON.parse(market.outcomePrices || "[0, 0]");

  return {
    id: market.conditionId,
    provider: "POLYMARKET",
    question: market.question,
    description: market.description || "",
    status: "Open" as MarketStatus,
    expirationDate: market.endDate,
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
      yes: {
        bid: market.bestBid ? parseFloat(market.bestBid) : undefined,
        ask: market.bestAsk ? parseFloat(market.bestAsk) : undefined,
      },
      no: {
        bid: undefined,
        ask: undefined,
      },
    },
    contract: {
      address: market.conditionId,
      network: "polygon",
    },
    outcomeTokens: {
      yes: tokenIds[0],
      no: tokenIds[1],
    },
  };
};

async function fetchPolymarketsByConditionIds(
  conditionIds: string[]
): Promise<PolymarketMarket[]> {
  try {
    const conditionIdsParam = conditionIds
      .map((id) => `condition_ids=${id}`)
      .join("&");
    const url = `${GAMMA_API_URL}/markets?${conditionIdsParam}`;

    console.log("Fetching Polymarket markets from URL:", url);

    const response = await fetch(url);
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch Polymarket markets: ${response.status}`);
    }

    const markets = await response.json();
    console.log(
      "Raw Polymarket API response:",
      JSON.stringify(markets, null, 2)
    );

    if (!Array.isArray(markets)) {
      console.error("Unexpected API response structure:", markets);
      return [];
    }

    console.log(`Found ${markets.length} markets in response`);

    const transformedMarkets = markets
      .map((market) => {
        try {
          console.log("Transforming market:", market.conditionId);
          return transformMarket(market);
        } catch (error) {
          console.error(
            `Error transforming market ${market.conditionId}:`,
            error
          );
          return null;
        }
      })
      .filter((market): market is PolymarketMarket => market !== null);

    return transformedMarkets;
  } catch (error) {
    console.error("Error fetching Polymarket markets:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.type === "polymarketByIds" && Array.isArray(body.conditionIds)) {
      console.log("Fetching markets for condition IDs:", body.conditionIds);
      const markets = await fetchPolymarketsByConditionIds(body.conditionIds);
      console.log(`Returning ${markets.length} transformed markets`);

      return NextResponse.json({
        success: true,
        markets,
        total: markets.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid request: must provide conditionIds" },
      { status: 400 }
    );
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
