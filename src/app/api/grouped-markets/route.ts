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
import { fetchGroupedMarkets } from "@/services/spmc/grouped-markets";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Create cache key based on pagination params
    const cacheKey = `markets-page-${page}-limit-${limit}`;

    // Fetch grouped markets using the new strategy
    const transformedData = await fetchGroupedMarkets(limit, offset);

    // Note: Real-time prices are already included in the grouped markets data
    // from the SPMC API, so no additional price fetching is needed

    // Return response with cache headers
    return NextResponse.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=59",
        },
      }
    );
  } catch (error) {
    console.error("Markets API error:", error);
    return NextResponse.json(
      {
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
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
