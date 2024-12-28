// utils/transforms.ts
import type { Event, Market } from "@/components/types/market";

/**
 * Safely parses numeric values from API responses
 * @param value - String or undefined value to parse
 * @returns Parsed number or 0 if invalid
 */
export function safeParseFloat(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Transforms raw market data from Gamma API into our Market type
 * @param market - Raw market data from API
 * @returns Transformed Market object
 */
export function transformMarket(market: any): Market {
  // Parse token IDs with error handling
  let tokenPairs = {
    yes: { token_id: "", outcome: "YES" },
    no: { token_id: "", outcome: "NO" }
  };

  try {
    if (market.clobTokenIds) {
      const tokenIds = JSON.parse(market.clobTokenIds);
      if (Array.isArray(tokenIds) && tokenIds.length >= 2) {
        tokenPairs = {
          yes: { token_id: tokenIds[0], outcome: "YES" },
          no: { token_id: tokenIds[1], outcome: "NO" }
        };
      }
    }
  } catch (e) {
    console.warn("[Transform] Error parsing clobTokenIds:", e);
  }

  return {
    end_date_iso: market.endDateIso || market.endDate?.split('T')[0] || '',
    condition_id: market.conditionId || market.id,
    question: market.question || '',
    description: market.description || '',
    resolutionSource: market.resolutionSource || '',
    volume_num: safeParseFloat(market.volumeNum || market.volume),
    liquidity_num: safeParseFloat(market.liquidityNum || market.liquidity),
    bestAsk: safeParseFloat(market.bestAsk),
    bestBid: safeParseFloat(market.bestBid),
    active: Boolean(market.active),
    tokens: tokenPairs
  };
}

/**
 * Transforms raw event data from Gamma API into our Event type
 * @param event - Raw event data from API
 * @returns Transformed Event object
 */
export function transformEvent(event: any): Event {
  return {
    id: event.id,
    title: event.title || "Untitled Event",
    liquidity: safeParseFloat(event.liquidity),
    volume: safeParseFloat(event.volume),
    description: event.description || "",
    markets: Array.isArray(event.markets) 
      ? event.markets.map((market: any) => ({
          id: market.conditionId || market.id,
          question: market.question || "Untitled Market",
          liquidity: safeParseFloat(market.liquidity)
        }))
      : []
  };
}

/**
 * Filters and sorts events based on search criteria
 */
export function searchEvents(
  events: any[],
  searchTerm: string,
  sortBy: "volume" | "liquidity" = "liquidity",
  sortDirection: "asc" | "desc" = "desc"
): any[] {
  if (!searchTerm) {
    return events
      .sort((a, b) => {
        const aValue = sortBy === "volume" 
          ? safeParseFloat(a.volume) 
          : safeParseFloat(a.liquidity);
        const bValue = sortBy === "volume" 
          ? safeParseFloat(b.volume) 
          : safeParseFloat(b.liquidity);
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      })
      .slice(0, 20);
  }

  const searchTerms = searchTerm
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(term => term.trim());

  const scoredEvents = events.map(event => {
    let score = 0;
    const eventTitle = (event.title || "").toLowerCase();
    const eventDesc = (event.description || "").toLowerCase();

    for (const term of searchTerms) {
      if (eventTitle.includes(term)) score += 10;
      if (eventDesc.includes(term)) score += 5;

      for (const market of event.markets || []) {
        const question = (market.question || "").toLowerCase();
        if (question.includes(term)) score += 8;
      }
    }

    return { event, score };
  });

  return scoredEvents
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      
      const aValue = sortBy === "volume" 
        ? safeParseFloat(a.event.volume) 
        : safeParseFloat(a.event.liquidity);
      const bValue = sortBy === "volume" 
        ? safeParseFloat(b.event.volume) 
        : safeParseFloat(b.event.liquidity);
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    })
    .map(item => item.event)
    .slice(0, 20);
}