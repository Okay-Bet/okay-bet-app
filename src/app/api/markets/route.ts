// app/api/markets/route.ts
import { NextResponse } from "next/server";

// API Configuration
const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const DEFAULT_SEARCH_LIMIT = 100; // Reduced to avoid API issues
const MAX_RESULTS = 20;

// Type Definitions
interface SearchParams {
  searchTerm?: string;
  sortBy?: "volume" | "liquidity";
  sortDirection?: "asc" | "desc";
  endDateMin?: string;
  endDateMax?: string;
  volumeMin?: number;
  volumeMax?: number;
  liquidityMin?: number;
  liquidityMax?: number;
  limit?: number;
}

interface ApiRequest {
  type: "search" | "market" | "topEvents";
  eventId?: string;
  limit?: number;
  searchParams?: SearchParams;
}

interface GammaMarket {
  end_date_iso: string;
  condition_id: string;
  question: string;
  description?: string;
  resolution_source?: string;
  volume: string;
  liquidity: string;
  best_ask?: string;
  active?: boolean;
  tokens: {
    yes: {
      token_id: string;
      outcome: string;
    };
    no: {
      token_id: string;
      outcome: string;
    };
  };
}

interface GammaEvent {
  id: string;
  title: string;
  description?: string;
  volume: string;
  liquidity: string;
  markets: GammaMarket[];
}

interface TransformedMarket {
  end_date_iso: string;
  condition_id: string;
  question: string;
  description?: string;
  resolutionSource?: string;
  volume_num: number;
  liquidity_num: number;
  bestAsk?: number;
  active?: boolean;
  tokens: {
    yes: {
      token_id: string;
      outcome: string;
    };
    no: {
      token_id: string;
      outcome: string;
    };
  };
}

interface TransformedEvent {
  id: string;
  title: string;
  description?: string;
  volume: number;
  liquidity: number;
  markets: TransformedMarket[];
}

const safeParseFloat = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const buildSearchUrl = (params: SearchParams): string => {
  const queryParams = new URLSearchParams();

  // Essential parameters
  queryParams.append("closed", "false");

  // Don't request too many records at once
  queryParams.append("limit", "100");

  // Handle date range if provided
  if (params.endDateMin) {
    queryParams.append("end_date_min", params.endDateMin);
  }
  if (params.endDateMax) {
    queryParams.append("end_date_max", params.endDateMax);
  }

  // Handle liquidity range - use their exact parameter names
  if (params.liquidityMin !== undefined) {
    queryParams.append("liquidity_min", params.liquidityMin.toString());
  }
  if (params.liquidityMax !== undefined) {
    queryParams.append("liquidity_max", params.liquidityMax.toString());
  }

  // Handle volume range - use their exact parameter names
  if (params.volumeMin !== undefined) {
    queryParams.append("volume_min", params.volumeMin.toString());
  }
  if (params.volumeMax !== undefined) {
    queryParams.append("volume_max", params.volumeMax.toString());
  }

  return `${GAMMA_API_URL}/events?${queryParams.toString()}`;
};

// Transform functions
const transformMarket = (market: GammaMarket): TransformedMarket => {
  return {
    end_date_iso: market.end_date_iso,
    condition_id: market.condition_id,
    question: market.question,
    description: market.description,
    resolutionSource: market.resolution_source,
    volume_num: safeParseFloat(market.volume),
    liquidity_num: safeParseFloat(market.liquidity),
    bestAsk: market.best_ask ? safeParseFloat(market.best_ask) : undefined,
    active: market.active,
    tokens: market.tokens,
  };
};

const transformEvent = (event: GammaEvent): TransformedEvent => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    volume: safeParseFloat(event.volume),
    liquidity: safeParseFloat(event.liquidity),
    markets: event.markets.map(transformMarket),
  };
};

const searchEvents = (
  events: GammaEvent[],
  searchTerm: string,
  sortBy: "volume" | "liquidity" = "liquidity",
  sortDirection: "asc" | "desc" = "desc"
): GammaEvent[] => {
  if (!searchTerm) {
    return events
      .sort((a, b) => {
        const aValue =
          sortBy === "volume"
            ? safeParseFloat(a.volume)
            : safeParseFloat(a.liquidity);
        const bValue =
          sortBy === "volume"
            ? safeParseFloat(b.volume)
            : safeParseFloat(b.liquidity);
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      })
      .slice(0, MAX_RESULTS);
  }

  const searchTerms = searchTerm
    .toLowerCase()
    .split(" ")
    .filter((term) => term.length > 0)
    .map((term) => term.trim());

  const scoredEvents = events.map((event) => {
    let score = 0;
    const eventTitle = (event.title || "").toLowerCase();
    const eventDesc = (event.description || "").toLowerCase();

    for (const term of searchTerms) {
      if (eventTitle.includes(term)) score += 10;
      if (eventDesc.includes(term)) score += 5;

      for (const market of event.markets) {
        const question = (market.question || "").toLowerCase();
        if (question.includes(term)) score += 8;
      }
    }

    return { event, score };
  });

  return scoredEvents
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aValue =
        sortBy === "volume"
          ? safeParseFloat(a.event.volume)
          : safeParseFloat(a.event.liquidity);
      const bValue =
        sortBy === "volume"
          ? safeParseFloat(b.event.volume)
          : safeParseFloat(b.event.liquidity);
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    })
    .map((item) => item.event)
    .slice(0, MAX_RESULTS);
};

// Main API Route Handler
export async function POST(request: Request) {
  try {
    const params: ApiRequest = await request.json();

    switch (params.type) {
      case "search": {
        // First, get base URL without search params
        const url = buildSearchUrl(params.searchParams || {});

        try {
          const response = await fetch(url);
          const contentType = response.headers.get("content-type");

          if (!response.ok) {
            console.error("API Error Response:", await response.text());
            throw new Error(
              `Gamma API error: ${response.status} ${response.statusText}`
            );
          }

          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid response format from Gamma API");
          }

          const data: GammaEvent[] = await response.json();

          // Apply text search and sorting
          const searchResults = searchEvents(
            data,
            params.searchParams?.searchTerm || "",
            params.searchParams?.sortBy || "liquidity",
            params.searchParams?.sortDirection || "desc"
          );

          const transformedEvents = searchResults.map(transformEvent);

          return NextResponse.json({
            events: transformedEvents,
            total: transformedEvents.length,
            hasMore: searchResults.length >= MAX_RESULTS,
          });
        } catch (error) {
          console.error("Error fetching from Gamma API:", error);
          throw error;
        }
      }

      case "market": {
        if (!params.eventId) {
          return NextResponse.json(
            { error: "Event ID required" },
            { status: 400 }
          );
        }

        const url = `${GAMMA_API_URL}/events?closed=false&id=${params.eventId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Gamma API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const event = data[0];

        if (!event || !event.markets) {
          return NextResponse.json(
            { error: "Event not found" },
            { status: 404 }
          );
        }

        const transformedEvent = {
          ...transformEvent(event),
          markets: event.markets.map(transformMarket),
        };

        return NextResponse.json(transformedEvent);
      }

      case "topEvents": {
        const limit = params.limit || 10;
        const url = `${GAMMA_API_URL}/events?closed=false&limit=${limit}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Gamma API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        const transformedEvents = data
          .filter((event: GammaEvent) => event.markets?.length > 0)
          .map(transformEvent)
          .sort(
            (a: TransformedEvent, b: TransformedEvent) =>
              b.liquidity - a.liquidity
          )
          .slice(0, limit);

        return NextResponse.json({ events: transformedEvents });
      }

      default:
        return NextResponse.json(
          { error: "Invalid request type" },
          { status: 400 }
        );
    }
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
