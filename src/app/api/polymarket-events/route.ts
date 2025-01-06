// app/api/polymarket-events/route.ts
import { NextResponse } from "next/server";
import { Event, SearchParams } from "@/app/types/market";
import { transformMarket } from "@/utils/transforms";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const MAX_RESULTS = 20;
const MIN_LIQUIDITY = 50;
const MIN_ACTIVE_PRICE = 0.005;
const MAX_DEAD_PRICE = 0.995;

// Helper function to get comparable YES price for sorting
function getComparableYesPrice(market: any): number {
  // Using yesBestAsk (the price to buy YES) for sorting
  // If no ask price exists, use bid price as fallback
  const price = market.yesBestAsk || market.yesBestBid;

  // Return -1 for markets without price data to push them to the end
  return price || -1;
}

// Function to sort markets by YES price descending
function sortMarketsByYesPrice(markets: any[]): any[] {
  return [...markets].sort((a, b) => {
    const priceA = getComparableYesPrice(a);
    const priceB = getComparableYesPrice(b);
    return priceB - priceA; // Descending order
  });
}

function isMarketActive(market: any): boolean {

  const transformedMarket = transformMarket(market);

  if (!transformedMarket) {
    return false;
  }

  if (
    !transformedMarket.liquidity_num ||
    transformedMarket.liquidity_num < MIN_LIQUIDITY
  ) {
    return false;
  }

  const yesBestPrice = transformedMarket.yesBestAsk;
  const noBestPrice = transformedMarket.noBestAsk;

  if (!yesBestPrice && !noBestPrice) {
    return false;
  }

  if (yesBestPrice) {
    if (yesBestPrice < MIN_ACTIVE_PRICE || yesBestPrice > MAX_DEAD_PRICE) {
      return false;
    }
  }

  if (noBestPrice) {
    if (noBestPrice < MIN_ACTIVE_PRICE || noBestPrice > MAX_DEAD_PRICE) {
      return false;
    }
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const {
      searchParams,
      limit,
    }: { searchParams?: SearchParams; limit?: number } = await request.json();

    const queryParams = new URLSearchParams();
    queryParams.append("closed", "false");
    queryParams.append("limit", (limit || 100).toString());

    const url = `${GAMMA_API_URL}/events?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Process events with proper transformation and sorting
    const processedEvents = data
      .filter((event: any) => Array.isArray(event.markets))
      .map((event: any) => {

        // Transform and filter markets
        const activeMarkets = event.markets
          .filter((market) => market && typeof market === "object")
          .filter(isMarketActive)
          .map((market) => transformMarket(market))
          .filter(Boolean);


        if (activeMarkets.length === 0) {
          return null;
        }

        // Sort markets by YES price before creating the event object
        const sortedMarkets = sortMarketsByYesPrice(activeMarkets);

        return {
          id: event.id,
          title: event.title,
          markets: sortedMarkets,
          liquidity: activeMarkets.reduce(
            (sum: number, market: any) => sum + (market.liquidity_num || 0),
            0
          ),
        };
      })
      .filter(Boolean);

    // Apply search filtering
    let filteredEvents = processedEvents;
    if (searchParams?.searchTerm) {
      const searchLower = searchParams.searchTerm.toLowerCase();
      filteredEvents = processedEvents.filter(
        (event: any) =>
          event.title.toLowerCase().includes(searchLower) ||
          event.markets.some((market: any) =>
            market.question.toLowerCase().includes(searchLower)
          )
      );
    }

    // Sort events
    const sortBy = searchParams?.sortBy || "liquidity";
    const sortDirection = searchParams?.sortDirection || "desc";

    filteredEvents.sort((a: any, b: any) => {
      const multiplier = sortDirection === "desc" ? -1 : 1;
      return multiplier * (a[sortBy] - b[sortBy]);
    });

    return NextResponse.json({
      events: filteredEvents.slice(0, MAX_RESULTS),
      total: filteredEvents.length,
      hasMore: filteredEvents.length >= MAX_RESULTS,
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
