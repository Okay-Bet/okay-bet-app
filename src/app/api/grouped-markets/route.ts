// src/app/api/grouped-markets/route.ts
import { NextResponse } from "next/server";
import type {
  GroupedMarketCard,
  GroupedMarketsResponse,
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket
} from "@/components/types/market";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";
import { fetchPolymarketData } from "@/app/api/markets/utils";
import { fetchKalshiMarkets } from "@/app/api/kalshi/utils";

// Cache configuration
const CACHE_DURATION = 30000; // Reduced to 30 seconds
const BATCH_SIZE = 2; // Reduced from 3
const BATCH_DELAY = 500; // Reduced from 1000ms to 500ms
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

// Strongly typed cache
interface CacheEntry {
  data: GroupedMarketCard[];
  timestamp: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let marketCache: CacheEntry | null = null;

// Rate-limited batch processing
async function fetchMarketsInBatches<T>(
  ids: string[],
  fetchFn: (batchIds: string[]) => Promise<T[]>
): Promise<T[]> {
  const uniqueIds = Array.from(new Set(ids)); // Deduplicate IDs
  const batches = [];

  // Create smaller batches
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    batches.push(uniqueIds.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (const batch of batches) {
    try {
      const batchResults = await fetchFn(batch);
      results.push(...batchResults);
      // Add delay between batches
      await delay(BATCH_DELAY);
    } catch (error: unknown) {
      console.error(`Batch fetch error:`, error);
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('429')
      ) {
        await delay(BATCH_DELAY * 2);
      }
    }
  }
  return results;
}

async function fetchGroupedMarketsFromAPI(): Promise<GroupedMarketCard[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/grouped-markets/groups/markets`, {
      headers: {
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch grouped markets: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching grouped markets:", error);
    throw error;
  }
}

async function processMarketData(rawData: GroupedMarketCard[]): Promise<GroupedMarketCard[]> {
  const results = [];
  const chunkSize = 2; // Reduced chunk size

  for (let i = 0; i < rawData.length; i += chunkSize) {
    const chunk = rawData.slice(i, i + chunkSize);
    const processedChunk = await Promise.all(chunk.map(async (group) => {
      try {
        const [limitlessMarkets, polymarketMarkets, kalshiMarkets] = await Promise.all([
          group.metrics.platforms.limitless?.markets?.map(m => m.id).length
            ? fetchMarketsInBatches(group.metrics.platforms.limitless.markets.map(m => m.id), fetchMarketsByIds)
            : Promise.resolve([]),
          group.metrics.platforms.polymarket?.markets?.map(m => m.id).length
            ? fetchMarketsInBatches(group.metrics.platforms.polymarket.markets.map(m => m.id), fetchPolymarketData)
            : Promise.resolve([]),
          group.metrics.platforms.kalshi?.markets?.map(m => m.id).length
            ? fetchMarketsInBatches(group.metrics.platforms.kalshi.markets.map(m => m.id), fetchKalshiMarkets)
            : Promise.resolve([]),
        ]);

        return {
          ...group,
          limitlessMarkets: limitlessMarkets.map(market => ({ market, similarity: 1 })),
          polymarketMarkets: polymarketMarkets.map(market => ({ market, similarity: 1 })),
          kalshiMarkets: kalshiMarkets.map(market => ({ market, similarity: 1 })),
          metrics: {
            totalVolume: calculateTotalVolume(limitlessMarkets, polymarketMarkets, kalshiMarkets),
            highestLiquidity: calculateHighestLiquidity(limitlessMarkets, polymarketMarkets, kalshiMarkets),
            platforms: group.metrics.platforms
          }
        };
      } catch (error) {
        console.error(`Error processing group ${group.id}:`, error);
        return group;
      }
    }));
    results.push(...processedChunk);
    await delay(BATCH_DELAY);
  }
  return results;
}

function calculateTotalVolume(
  limitlessMarkets: LimitlessMarket[],
  polymarketMarkets: PolymarketMarket[],
  kalshiMarkets: KalshiMarket[]
): number {
  return (
    limitlessMarkets.reduce((sum, m) => sum + parseFloat(m.metrics.volumeRaw || '0'), 0) +
    polymarketMarkets.reduce((sum, m) => sum + parseFloat(m.metrics.volumeRaw || '0'), 0) +
    kalshiMarkets.reduce((sum, m) => sum + parseFloat(m.metrics.volumeRaw || '0'), 0)
  );
}

function calculateHighestLiquidity(
  limitlessMarkets: LimitlessMarket[],
  polymarketMarkets: PolymarketMarket[],
  kalshiMarkets: KalshiMarket[]
): number {
  const allLiquidities = [
    ...limitlessMarkets.map(m => parseFloat(m.metrics.liquidityRaw || '0')),
    ...polymarketMarkets.map(m => parseFloat(m.metrics.liquidityRaw || '0')),
    ...kalshiMarkets.map(m => parseFloat(m.metrics.liquidityRaw || '0'))
  ];
  return Math.max(0, ...allLiquidities);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10'); // Reduced default limit

    // Check cache first
    if (marketCache && Date.now() - marketCache.timestamp < CACHE_DURATION) {
      const paginatedData = paginateData(marketCache.data, page, limit);
      return NextResponse.json({
        success: true,
        data: paginatedData.items,
        pagination: paginatedData.pagination
      } satisfies GroupedMarketsResponse);
    }

    // Fetch only what we need for this page
    const rawData = await fetchGroupedMarketsFromAPI();
    
    // Only process the current page's worth of data
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const pageData = rawData.slice(startIndex, endIndex);
    
    const processedData = await processMarketData(pageData);

    // Cache the processed page
    marketCache = {
      data: processedData,
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      data: processedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(rawData.length / limit),
        totalItems: rawData.length,
        itemsPerPage: limit,
        hasNextPage: endIndex < rawData.length,
        hasPreviousPage: page > 1,
      }
    } satisfies GroupedMarketsResponse);

  } catch (error) {
    console.error("Error in grouped markets API:", error);
    return NextResponse.json({
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    } satisfies GroupedMarketsResponse, { status: 500 });
  }
}

function paginateData(data: GroupedMarketCard[], page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return {
    items: data.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalItems: data.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < data.length,
      hasPreviousPage: page > 1,
    }
  };
}