// utils/market.ts
import type { Event, Market, SearchParams } from "@/components/types/market";

// Utility for safe float parsing - handles edge cases like undefined or invalid strings
export const safeParseFloat = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Transform raw market data into our typed interface
export const transformMarket = (market: any): Market => {
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

// Transform raw event data into our typed interface
export const transformEvent = (event: any): Event => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    volume: safeParseFloat(event.volume),
    liquidity: safeParseFloat(event.liquidity),
    markets: event.markets.map((market: any) => ({
      id: market.condition_id,
      question: market.question,
      liquidity: safeParseFloat(market.liquidity),
    })),
  };
};

// Search and sort events with configurable criteria
export const searchEvents = (
  events: any[],
  searchTerm: string,
  sortBy: "volume" | "liquidity" = "liquidity",
  sortDirection: "asc" | "desc" = "desc"
): any[] => {
  if (!searchTerm) {
    return events
      .sort((a, b) => {
        const aValue = sortBy === "volume" ? safeParseFloat(a.volume) : safeParseFloat(a.liquidity);
        const bValue = sortBy === "volume" ? safeParseFloat(b.volume) : safeParseFloat(b.liquidity);
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      })
      .slice(0, 20);
  }

  const searchTerms = searchTerm.toLowerCase().split(" ").filter(Boolean).map(term => term.trim());

  const scoredEvents = events.map(event => {
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
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      
      const aValue = sortBy === "volume" ? safeParseFloat(a.event.volume) : safeParseFloat(a.event.liquidity);
      const bValue = sortBy === "volume" ? safeParseFloat(b.event.volume) : safeParseFloat(b.event.liquidity);
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    })
    .map(item => item.event)
    .slice(0, 20);
};