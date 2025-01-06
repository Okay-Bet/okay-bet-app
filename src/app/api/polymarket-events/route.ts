// app/api/polymarket-events/route.ts
import { NextResponse } from "next/server";
import {
  Event,
  Market,
  SearchParams,
  MARKET_CONSTANTS,
} from "../../../components/types/market";
import { transformMarket } from "../../../utils/transforms";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const MAX_RESULTS = 20;
// Using constants from types file instead of magic numbers
const MIN_LIQUIDITY = MARKET_CONSTANTS.MIN_LIQUIDITY;
const MIN_ACTIVE_PRICE = MARKET_CONSTANTS.MIN_ACTIVE_PRICE;
const MAX_DEAD_PRICE = MARKET_CONSTANTS.MAX_DEAD_PRICE;

function getComparableYesPrice(market: Market): number {
  const price = market.yesBestAsk || market.yesBestBid;
  return price ?? -1; // Using nullish coalescing for better type safety
}

function sortMarketsByYesPrice(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => {
    const priceA = getComparableYesPrice(a);
    const priceB = getComparableYesPrice(b);
    return priceB - priceA;
  });
}

function isMarketActive(market: Partial<Market>): boolean {
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

interface RawEvent {
  id: string;
  title: string;
  markets: Partial<Market>[];
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
      .filter((event: RawEvent) => Array.isArray(event.markets))
      .map((event: RawEvent) => {
        // Transform and filter markets
        const activeMarkets = event.markets
          .filter(
            (market: Partial<Market>): market is Market =>
              market !== null &&
              typeof market === "object" &&
              isMarketActive(market)
          )
          .map(transformMarket)
          .filter((market): market is Market => market !== null);

        if (activeMarkets.length === 0) {
          return null;
        }

        // Sort markets by YES price before creating the event object
        const sortedMarkets = sortMarketsByYesPrice(activeMarkets);

        // Calculate both liquidity and volume from active markets
        const liquidity = activeMarkets.reduce(
          (sum, market) => sum + (market.liquidity_num || 0),
          0
        );
        const volume = activeMarkets.reduce(
          (sum, market) => sum + (market.volume_num || 0),
          0
        );

        return {
          id: event.id,
          title: event.title,
          markets: sortedMarkets,
          liquidity,
          volume,
          activeMarketsCount: activeMarkets.length,
        } satisfies Event;
      })
      .filter((event: Event | null): event is Event => event !== null);

    // Apply search filtering
    let filteredEvents = processedEvents;
    if (searchParams?.searchTerm) {
      const searchLower = searchParams.searchTerm.toLowerCase();
      filteredEvents = processedEvents.filter(
        (event: Event) =>
          event.title.toLowerCase().includes(searchLower) ||
          event.markets.some((market) =>
            market.question.toLowerCase().includes(searchLower)
          )
      );
    }

    // Sort events
    const sortBy = searchParams?.sortBy || "liquidity";
    const sortDirection = searchParams?.sortDirection || "desc";

    filteredEvents.sort((a: Event, b: Event) => {
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
