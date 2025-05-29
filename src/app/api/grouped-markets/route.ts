import { NextResponse } from "next/server";
import type {
  GroupedMarketCard,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket
} from "@/components/types/market";

const FASTAPI_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Cache configuration
const CACHE_DURATION = 30000;
let marketCache: { data: GroupedMarketCard[]; timestamp: number } | null = null;

interface MarketMetrics {
  id: string;
  volume: number;
  liquidity: number;
  openInterest: number;
}

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
  kalshiMarkets: Record<string, {
    market_id: string;
    title: string;
    status: string;
    volume: number;
    liquidity: number;
    open_interest: number;
    best_ask_price?: number;
    best_bid_price?: number;
    expiration_date: string;
    event_ticker: string;
  }> | null;
  polymarketMarkets: Record<string, {
    market_id: string;
    question: string;
    volume: string | number;
    liquidity: string | number;
    end_date: string;
    no_best_buy_price: number;
    no_best_sell_price: number;
    yes_best_buy_price: number;
    yes_best_sell_price: number;
  }> | null;
  limitlessMarkets: Record<string, {
    id: string;
    title: string;
    status: string;
    volume: number;
    liquidity: number;
    expiration_date: string;
    best_ask_price: number;
    best_bid_price: number;
  }> | null;
}

function transformKalshiData(data: ConsolidatedMarketResponse['kalshiMarkets'][string]): KalshiMarket {
  return {
    id: data.market_id,
    provider: "KALSHI",
    question: data.title,
    description: "",
    ticker: data.event_ticker,
    category: data.event_ticker,
    status: data.status || "ACTIVE",
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
    prices: {
      yes: {
        bid: data.best_bid_price,
        ask: data.best_ask_price,
      },
      no: {
        bid: data.best_bid_price ? (1 - data.best_bid_price) : undefined,
        ask: data.best_ask_price ? (1 - data.best_ask_price) : undefined,
      },
    },
    contract: {
      address: data.market_id,
      network: "kalshi",
    },
  };
}

function transformPolymarketData(data: ConsolidatedMarketResponse['polymarketMarkets'][string]): PolymarketMarket {
  return {
    id: data.market_id,
    provider: "POLYMARKET",
    question: data.question,
    description: "",
    slug: "",
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
      volume: String(data.volume),
      volumeRaw: String(data.volume),
      liquidity: String(data.liquidity),
      liquidityRaw: String(data.liquidity),
      openInterest: "0",
      openInterestRaw: "0",
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
  };
}

function transformLimitlessData(data: ConsolidatedMarketResponse['limitlessMarkets'][string]): LimitlessMarket {
  return {
    id: data.id,
    provider: "LIMITLESS",
    question: data.title,
    description: "",
    status: data.status,
    slug: "",
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
      openInterest: "0",
      openInterestRaw: "0",
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

function transformConsolidatedData(response: { success: boolean, data: ConsolidatedMarketResponse[] } | ConsolidatedMarketResponse[]): GroupedMarketCard[] {
  // Handle both wrapped and unwrapped responses
  const data = Array.isArray(response) ? response : response.data;
  
  if (!Array.isArray(data)) {
    console.error("Invalid data structure received:", data);
    return [];
  }

  return data
    .filter(item => item.kalshiMarkets || item.polymarketMarkets || item.limitlessMarkets) // Filter out items where all markets are null
    .map(item => {
      const limitlessMarkets = item.limitlessMarkets
        ? Object.values(item.limitlessMarkets).map(market => ({
            market: transformLimitlessData(market),
            similarity: 1
          }))
        : [];

      const polymarketMarkets = item.polymarketMarkets
        ? Object.values(item.polymarketMarkets).map(market => ({
            market: transformPolymarketData(market),
            similarity: 1
          }))
        : [];

      const kalshiMarkets = item.kalshiMarkets
        ? Object.values(item.kalshiMarkets).map(market => ({
            market: transformKalshiData(market),
            similarity: 1
          }))
        : [];

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        metrics: item.metrics,
        limitlessMarkets,
        polymarketMarkets,
        kalshiMarkets
      };
    });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Check cache
    if (marketCache && Date.now() - marketCache.timestamp < CACHE_DURATION) {
      const start = (page - 1) * limit;
      const end = start + limit;
      return NextResponse.json({
        success: true,
        data: marketCache.data.slice(start, end),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(marketCache.data.length / limit),
          totalItems: marketCache.data.length,
          itemsPerPage: limit,
          hasNextPage: end < marketCache.data.length,
          hasPreviousPage: page > 1,
        }
      });
    }

    const response = await fetch(
      `${FASTAPI_URL}/api/v1/grouped-markets/fetch_consolidated_markets?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch consolidated markets: ${response.status}`);
    }

    const rawData = await response.json();

    const transformedData = transformConsolidatedData(rawData);

    // Update cache
    marketCache = {
      data: transformedData,
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: transformedData.length * page,
        totalPages: Math.ceil((transformedData.length * page) / limit),
        hasNextPage: transformedData.length === limit,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error("Error in consolidated markets API:", error);
    return NextResponse.json({
      success: false,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      }
    });
  }
}