import { NextResponse } from "next/server";
import type {
  MarketProvider,
  Market,
  PolymarketMarket,
  MarketStatus,
  BaseMarket,
  LimitlessMarket,
  SearchParams,
  Event,
} from "../../../../components/types";
import { SUPPORTED_TOKENS } from "../../../../services/across/client";
import { LimitlessAPIMarket, transformMarket, fetchMarketsByIds } from "./utils";
const LIMITLESS_API_URL = "https://api.limitless.exchange";
const MAX_RESULTS = 20;



interface LimitlessAPIResponse {
  data: LimitlessAPIMarket[];
  totalMarketsCount: number;
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle fetching specific markets by IDs
    if (body.marketIds && Array.isArray(body.marketIds)) {
      const markets = await fetchMarketsByIds(body.marketIds);
      return NextResponse.json({
        success: true,
        markets,
        total: markets.length,
      });
    }

    // Handle search case
    if (body.searchParams) {
      const response = await fetch(`${LIMITLESS_API_URL}/markets/active`);
      if (!response.ok) {
        throw new Error(
          `Limitless API error: ${response.status} ${response.statusText}`
        );
      }

      const apiResponse: LimitlessAPIResponse = await response.json();
      const filteredMarkets = filterMarkets(
        apiResponse.data,
        body.searchParams
      );
      const transformedMarkets = filteredMarkets.map(transformMarket);
      const events = transformedMarkets.map(transformToEvent);

      return NextResponse.json({
        events,
        total: events.length,
        hasMore:
          filteredMarkets.length >= (body.searchParams?.limit || MAX_RESULTS),
      });
    }

    return NextResponse.json(
      { error: "Invalid request: must provide searchParams or marketIds" },
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

// Helper functions from original code
const transformToEvent = (market: LimitlessMarket): Event => {
  return {
    id: market.id,
    title: market.question,
    description: market.description,
    liquidity: parseFloat(market.metrics.liquidity),
    volume: parseFloat(market.metrics.volume),
    markets: [market],
    activeMarketsCount: 1,
  };
};

const filterMarkets = (
  markets: LimitlessAPIMarket[],
  searchParams: SearchParams = {}
): LimitlessAPIMarket[] => {
  // First, filter for USDC collateral and minimum liquidity
  let filteredMarkets = markets.filter((market) => {
    const isUSDCCollateral =
      market.collateralToken.address.toLowerCase() ===
      SUPPORTED_TOKENS.BASE.USDC.toLowerCase();
    const hasLiquidity = parseFloat(market.liquidityFormatted) > 0;

    return isUSDCCollateral && hasLiquidity;
  });

  // Apply search term filter
  if (searchParams.searchTerm) {
    const terms = searchParams.searchTerm
      .toLowerCase()
      .split(" ")
      .filter(Boolean);
    filteredMarkets = filteredMarkets.filter((market) =>
      terms.some(
        (term) =>
          market.title.toLowerCase().includes(term) ||
          market.description.toLowerCase().includes(term)
      )
    );
  }

  // Apply date range filter
  if (searchParams.endDateMin) {
    const minDate = new Date(searchParams.endDateMin).getTime();
    filteredMarkets = filteredMarkets.filter(
      (market) => market.expirationTimestamp >= minDate
    );
  }
  if (searchParams.endDateMax) {
    const maxDate = new Date(searchParams.endDateMax).getTime();
    filteredMarkets = filteredMarkets.filter(
      (market) => market.expirationTimestamp <= maxDate
    );
  }

  // Apply sorting
  const sortBy = searchParams.sortBy || "liquidity";
  const sortDirection = searchParams.sortDirection || "desc";

  filteredMarkets.sort((a, b) => {
    const aValue = parseFloat(a[`${sortBy}Formatted`]);
    const bValue = parseFloat(b[`${sortBy}Formatted`]);
    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  return filteredMarkets.slice(0, searchParams.limit || MAX_RESULTS);
};
