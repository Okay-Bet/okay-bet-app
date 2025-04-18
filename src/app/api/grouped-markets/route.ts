// src/app/api/grouped-markets/route.ts
import { NextResponse } from "next/server";
import type {
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
} from "@/components/types";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";
import { fetchPolymarketData } from "@/app/api/markets/utils";
import { fetchKalshiMarkets } from "@/app/api/kalshi/utils";

// Define interface for the new database schema
interface GroupedMarket {
  id: string;
  title: string;
  final_end_date: string;
  created_at: string;
  updated_at: string;
  market_ids: {
    kalshi: string[];
    polymarket: string[];
    limitless?: string[];
  };
  platforms: {
    kalshi: {
      markets: Array<{
        id: string;
        volume: number;
        liquidity: number;
        openInterest: number;
      }>;
    };
    polymarket: {
      markets: Array<{
        id: string;
        volume: number;
        liquidity: number;
      }>;
    };
    limitless: {
      markets: Array<{
        id: string;
        volume: number;
        liquidity?: number;
        openInterest?: number;
      }>;
    };
  };
  metrics: {
    platforms: {
      kalshi: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
          openInterest: number;
        }>;
      };
      polymarket: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
        }>;
      };
      limitless: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity?: number;
          openInterest?: number;
        }>;
      };
    };
  };
}

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

async function fetchGroupedMarkets(): Promise<GroupedMarket[]> {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/grouped-markets/groups/markets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch grouped markets: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching grouped markets:", error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const groupedMarkets = await fetchGroupedMarkets();

    // Fetch latest market data for each platform
    const marketFetchPromises = groupedMarkets.map(async (group) => {
      const [limitlessMarkets, polymarketMarkets, kalshiMarkets] = await Promise.all([
        group.market_ids.limitless?.length 
          ? fetchMarketsByIds(group.market_ids.limitless)
          : Promise.resolve([]),
        group.market_ids.polymarket?.length 
          ? fetchPolymarketData(group.market_ids.polymarket)
          : Promise.resolve([]),
        group.market_ids.kalshi?.length 
          ? fetchKalshiMarkets(group.market_ids.kalshi)
          : Promise.resolve([]),
      ]);

      // Create maps for quick lookup
      const marketMaps = {
        limitless: new Map(limitlessMarkets.map(m => [m.id, m])),
        polymarket: new Map(polymarketMarkets.map(m => [m.id, m])),
        kalshi: new Map(kalshiMarkets.map(m => [m.id, m])),
      };

      // Process markets for each platform
      const processedMarkets = {
        limitlessMarkets: group.platforms.limitless.markets.map(m => ({
          market: marketMaps.limitless.get(m.id)!,
          similarity: 1, // or any other relevant similarity metric
        })).filter(m => m.market),
        polymarketMarkets: group.platforms.polymarket.markets.map(m => ({
          market: marketMaps.polymarket.get(m.id)!,
          similarity: 1,
        })).filter(m => m.market),
        kalshiMarkets: group.platforms.kalshi.markets.map(m => ({
          market: marketMaps.kalshi.get(m.id)!,
          similarity: 1,
        })).filter(m => m.market),
      };

      return {
        id: group.id,
        title: group.title,
        final_end_date: group.final_end_date,
        created_at: group.created_at,
        updated_at: group.updated_at,
        ...processedMarkets,
        metrics: {
          totalVolume: 
            group.platforms.kalshi.markets.reduce((sum, m) => sum + (m.volume || 0), 0) +
            group.platforms.polymarket.markets.reduce((sum, m) => sum + (m.volume || 0), 0) +
            group.platforms.limitless.markets.reduce((sum, m) => sum + (m.volume || 0), 0),
          highestLiquidity: Math.max(
            ...group.platforms.kalshi.markets.map(m => Math.max(m.liquidity || 0, m.openInterest || 0)),
            ...group.platforms.polymarket.markets.map(m => m.liquidity || 0),
            ...group.platforms.limitless.markets.map(m => m.liquidity || m.openInterest || 0)
          ),
          platforms: group.platforms,
        },
      };
    });

    const processedGroupedMarkets = await Promise.all(marketFetchPromises);

    return NextResponse.json({
      success: true,
      data: processedGroupedMarkets,
    });
  } catch (error) {
    console.error("Error processing grouped markets:", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch grouped markets",
      },
      { status: 500 }
    );
  }
}