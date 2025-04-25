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
const CACHE_DURATION = 60000; // Increased to 60 seconds
const BATCH_SIZE = 3; // Process 5 markets at a time
const BATCH_DELAY = 1000; // 1 second delay between batches
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
    } catch (error: unknown) { // Explicitly type error as unknown
      console.error(`Batch fetch error:`, error);
      
      // Type guard to check if error is an object with a message property
      if (
        error && 
        typeof error === 'object' && 
        'message' in error && 
        typeof error.message === 'string' && 
        error.message.includes('429')
      ) {
        // If we hit rate limit, add longer delay
        await delay(BATCH_DELAY * 2);
      }
    }
  }

  return results;
}

async function fetchGroupedMarketsFromAPI(): Promise<GroupedMarketCard[]> {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/grouped-markets/groups/markets`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
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
  // Process smaller chunks of groups at a time
  const results = [];
  const chunkSize = 5;
  
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
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check cache first
    if (marketCache && Date.now() - marketCache.timestamp < CACHE_DURATION) {
      const paginatedData = paginateData(marketCache.data, page, limit);
      return NextResponse.json({
        success: true,
        data: paginatedData.items,
        pagination: paginatedData.pagination
      } satisfies GroupedMarketsResponse);
    }

    // Fetch new data only if cache is invalid
    const rawData = await fetchGroupedMarketsFromAPI();
    const processedData = await processMarketData(rawData);

    // Update cache
    marketCache = {
      data: processedData,
      timestamp: Date.now()
    };

    const paginatedData = paginateData(processedData, page, limit);
    return NextResponse.json({
      success: true,
      data: paginatedData.items,
      pagination: paginatedData.pagination
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