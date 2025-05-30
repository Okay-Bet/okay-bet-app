import { NextResponse } from "next/server";
import type {
  GroupedMarketCard,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
  PaginationInfo,
  GroupedMarketsResponse,
} from "@/components/types/market";
import { MarketStatus } from "@/components/types/core";

const FASTAPI_URL = process.env.FASTAPI_BASE_URL;
if (!FASTAPI_URL) {
  console.error("FASTAPI_BASE_URL environment variable is not set");
}

// // Cache configuration
// const CACHE_DURATION = 30000;
// let marketCache: { data: GroupedMarketCard[]; timestamp: number } | null = null;

interface MarketMetrics {
  id: string;
  volume: number;
  liquidity: number;
  openInterest: number;
}

type KalshiMarketData = {
  market_id: string;
  title: string;
  description: string;
  rules: string;
  status: string;
  volume: number;
  liquidity: number;
  open_interest: number;
  best_ask_price?: number;
  best_bid_price?: number;
  expiration_date: string;
  event_ticker: string;
};

type PolymarketData = {
  market_id: string;
  question: string;
  description: string;
  rules: string;
  volume: string | number;
  liquidity: string | number;
  end_date: string;
  no_best_buy_price: number;
  no_best_sell_price: number;
  yes_best_buy_price: number;
  yes_best_sell_price: number;
  market_slug: string;
};

type LimitlessMarketData = {
  id: string;
  title: string;
  description: string;
  rules: string;
  status: string;
  volume: number;
  liquidity: number;
  expiration_date: string;
  best_ask_price: number;
  best_bid_price: number;
  slug: string;
};

interface ConsolidatedMarketResponse {
  id: string;
  title: string;
  status: string;
  metrics: {
    platforms: {
      kalshi: { markets: MarketMetrics[] };
      limitless: { markets: MarketMetrics[] };
      polymarket: { markets: MarketMetrics[] };
    };
    totalVolume: number;
    highestLiquidity: number;
  };
  kalshiMarkets: Record<string, KalshiMarketData> | null;
  polymarketMarkets: Record<string, PolymarketData> | null;
  limitlessMarkets: Record<string, LimitlessMarketData> | null;
}

function transformKalshiData(data: KalshiMarketData): KalshiMarket {
  const description = data.description || "";
  const rules = data.rules || "";
  const fullDescription = [description, rules].filter(Boolean).join("\n\n");

  return {
    id: data.market_id,
    provider: "KALSHI",
    question: data.title,
    description: fullDescription,
    ticker: data.event_ticker,
    category: data.event_ticker,
    status: data.status as MarketStatus,
    expirationDate: data.expiration_date,
    timestamps: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    collateral: {
      address: "",
      symbol: "USD",
      decimals: 2,
    },
    metrics: {
      volume: String(data.volume || 0),
      volumeRaw: String(data.volume || 0),
      liquidity: String(data.liquidity || 0),
      liquidityRaw: String(data.liquidity || 0),
      openInterest: String(data.open_interest || 0),
      openInterestRaw: String(data.open_interest || 0),
    },
    volume24H: data.volume || 0,
    prices: {
      yes: {
        bid: data.best_bid_price,
        ask: data.best_ask_price,
      },
      no: {
        bid: data.best_bid_price ? 1 - data.best_bid_price : undefined,
        ask: data.best_ask_price ? 1 - data.best_ask_price : undefined,
      },
    },
    contract: {
      address: data.market_id,
      network: "kalshi",
    },
    openInterest: data.open_interest || 0,
  };
}

function transformPolymarketData(data: PolymarketData): PolymarketMarket {
  const description = data.description || "";
  const rules = data.rules || "";
  const fullDescription = [description, rules].filter(Boolean).join("\n\n");

  const volume =
    typeof data.volume === "string" ? parseFloat(data.volume) : data.volume;
  const liquidity =
    typeof data.liquidity === "string"
      ? parseFloat(data.liquidity)
      : data.liquidity;

  return {
    id: data.market_id,
    provider: "POLYMARKET",
    question: data.question,
    description: fullDescription,
    slug: data.market_slug,
    status: "ACTIVE",
    expirationDate: data.end_date,
    timestamps: {
      created: new Date().toISOString(),
    },
    collateral: {
      address: "",
      symbol: "USDC",
      decimals: 6,
    },
    metrics: {
      volume: String(volume),
      volumeRaw: String(volume),
      liquidity: String(liquidity),
      liquidityRaw: String(liquidity),
      openInterest: String(liquidity),
      openInterestRaw: String(liquidity),
    },
    prices: {
      yes: {
        bid: data.yes_best_buy_price,
        ask: data.yes_best_sell_price,
      },
      no: {
        bid: data.no_best_buy_price,
        ask: data.no_best_sell_price,
      },
    },
    contract: {
      address: data.market_id,
      network: "polygon",
    },
    outcomeTokens: {
      yes: "",
      no: "",
    },
    yesBestAsk: data.yes_best_sell_price,
    noBestAsk: data.no_best_sell_price,
    yesBestBid: data.yes_best_buy_price,
    noBestBid: data.no_best_buy_price,
  };
}

function transformLimitlessData(data: LimitlessMarketData): LimitlessMarket {
  const description = data.description || "";
  const rules = data.rules || "";
  const fullDescription = [description, rules].filter(Boolean).join("\n\n");

  return {
    id: data.id,
    provider: "LIMITLESS",
    question: data.title,
    description: fullDescription,
    status: data.status as MarketStatus,
    slug: data.slug,
    expirationDate: data.expiration_date,
    timestamps: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    collateral: {
      address: "",
      symbol: "$",
      decimals: 18,
    },
    metrics: {
      volume: String(data.volume || 0),
      volumeRaw: String(data.volume || 0),
      liquidity: String(data.liquidity || 0),
      liquidityRaw: String(data.liquidity || 0),
      openInterest: String(data.liquidity || 0),
      openInterestRaw: String(data.liquidity || 0),
    },
    prices: {
      yes: {
        bid: data.best_bid_price,
        ask: data.best_ask_price,
      },
      no: {
        bid: data.best_bid_price ? 1 - data.best_bid_price : undefined,
        ask: data.best_ask_price ? 1 - data.best_ask_price : undefined,
      },
    },
    contract: {
      address: data.id,
      network: "base",
    },
    conditionId: data.id,
  };
}

function transformConsolidatedData(
  response:
    | { success: boolean; data: ConsolidatedMarketResponse[] }
    | ConsolidatedMarketResponse[]
): GroupedMarketCard[] {
  const data = Array.isArray(response) ? response : response.data;

  if (!Array.isArray(data)) {
    console.error("Invalid data structure received:", data);
    return [];
  }

  return data
    .filter(
      (item) =>
        item.kalshiMarkets || item.polymarketMarkets || item.limitlessMarkets
    )
    .map((item) => {
      const limitlessMarkets = item.limitlessMarkets
        ? Object.values(item.limitlessMarkets).map((market) => ({
            market: transformLimitlessData(market),
            similarity: 1,
          }))
        : [];

      const polymarketMarkets = item.polymarketMarkets
        ? Object.values(item.polymarketMarkets).map((market) => ({
            market: transformPolymarketData(market),
            similarity: 1,
          }))
        : [];

      const kalshiMarkets = item.kalshiMarkets
        ? Object.values(item.kalshiMarkets).map((market) => ({
            market: transformKalshiData(market),
            similarity: 1,
          }))
        : [];

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        metrics: item.metrics,
        limitlessMarkets,
        polymarketMarkets,
        kalshiMarkets,
      };
    });
}

export async function GET(
  request: Request
): Promise<NextResponse<GroupedMarketsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;


    const response = await fetch(
      `${FASTAPI_URL}/api/v1/grouped-markets/fetch_consolidated_markets?limit=${limit}&offset=${offset}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        // Disable caching for now to debug
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      throw new Error(
        `FastAPI request failed: ${response.status} ${response.statusText}`
      );
    }

    const rawData = await response.json();
    const transformedData = transformConsolidatedData(rawData);

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: transformedData.length,
        totalPages: Math.ceil(transformedData.length / limit),
        hasNextPage: transformedData.length === limit,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    // Enhanced error logging
    console.error("Markets API error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  }
}
