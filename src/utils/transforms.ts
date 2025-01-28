// import type { Event, PolymarketMarket } from "../components/types";

// /**
//  * Safely parses numeric values from API responses
//  */
// export function safeParseFloat(
//   value: string | number | undefined
// ): number | undefined {
//   if (value === undefined || value === "") return undefined;
//   const parsed = typeof value === "number" ? value : parseFloat(value);
//   return isNaN(parsed) || parsed === 0 ? undefined : parsed;
// }

// /**
//  * Safely parses a JSON string array
//  */
// function safeJsonParse(jsonStr: string | undefined): any[] {
//   try {
//     return jsonStr ? JSON.parse(jsonStr) : [];
//   } catch (e) {
//     console.warn("[Transform] Error parsing JSON:", e);
//     return [];
//   }
// }

// export function transformMarket(market: any): Market {
//   // Parse bid/ask prices
//   const yesBestBid = safeParseFloat(market.bestBid);
//   const yesBestAsk = safeParseFloat(market.bestAsk);

//   // Calculate NO token prices as complement of YES prices
//   const noBestBid = yesBestAsk !== undefined ? 1 - yesBestAsk : undefined;
//   const noBestAsk = yesBestBid !== undefined ? 1 - yesBestBid : undefined;

//   // Parse token IDs
//   let tokenPairs = {
//     yes: { token_id: "", outcome: "YES" },
//     no: { token_id: "", outcome: "NO" },
//   };

//   const tokenIds = safeJsonParse(market.clobTokenIds);
//   if (tokenIds.length >= 2) {
//     tokenPairs = {
//       yes: { token_id: tokenIds[0], outcome: "YES" },
//       no: { token_id: tokenIds[1], outcome: "NO" },
//     };
//   }

//   return {
//     id: market.id || "",
//     condition_id: market.conditionId || market.id,
//     question: market.question || "",
//     description: market.description || "",
//     volume_num: safeParseFloat(market.volumeNum || market.volume) ?? 0,
//     liquidity_num: safeParseFloat(market.liquidityNum || market.liquidity) ?? 0,
//     yesBestBid,
//     yesBestAsk,
//     noBestBid,
//     noBestAsk,
//     active: Boolean(market.active),
//     isEffectivelyResolved: Boolean(market.isEffectivelyResolved),
//     tokens: tokenPairs,
//   };
// }

// /**
//  * Transforms raw event data from Gamma API into our Event type
//  * Always ensures numeric values have defaults to satisfy the Event interface requirements
//  */
// export function transformEvent(event: any): Event {
//   return {
//     id: event.id,
//     title: event.title || "Untitled Event",
//     liquidity: safeParseFloat(event.liquidity) ?? 0, // Provide default of 0
//     volume: safeParseFloat(event.volume) ?? 0, // Provide default of 0
//     description: event.description || "",
//     markets: Array.isArray(event.markets)
//       ? event.markets.map((market: any) => ({
//           id: market.conditionId || market.id,
//           question: market.question || "Untitled Market",
//           liquidity: safeParseFloat(market.liquidity) ?? 0, // Provide default here too
//         }))
//       : [],
//   };
// }

// /**
//  * Filters and sorts events based on search criteria
//  */
// export function searchEvents(
//   events: any[],
//   searchTerm: string,
//   sortBy: "volume" | "liquidity" = "liquidity",
//   sortDirection: "asc" | "desc" = "desc"
// ): any[] {
//   if (!searchTerm) {
//     return events
//       .sort((a, b) => {
//         const aValue =
//           sortBy === "volume"
//             ? safeParseFloat(a.volume) ?? 0
//             : safeParseFloat(a.liquidity) ?? 0;
//         const bValue =
//           sortBy === "volume"
//             ? safeParseFloat(b.volume) ?? 0
//             : safeParseFloat(b.liquidity) ?? 0;
//         return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
//       })
//       .slice(0, 20);
//   }

//   const searchTerms = searchTerm
//     .toLowerCase()
//     .split(" ")
//     .filter(Boolean)
//     .map((term) => term.trim());

//   const scoredEvents = events.map((event) => {
//     let score = 0;
//     const eventTitle = (event.title || "").toLowerCase();
//     const eventDesc = (event.description || "").toLowerCase();

//     for (const term of searchTerms) {
//       if (eventTitle.includes(term)) score += 10;
//       if (eventDesc.includes(term)) score += 5;

//       for (const market of event.markets || []) {
//         const question = (market.question || "").toLowerCase();
//         if (question.includes(term)) score += 8;
//       }
//     }

//     return { event, score };
//   });

//   return scoredEvents
//     .filter((item) => item.score > 0)
//     .sort((a, b) => {
//       if (b.score !== a.score) return b.score - a.score;

//       const aValue =
//         sortBy === "volume"
//           ? safeParseFloat(a.event.volume) ?? 0
//           : safeParseFloat(a.event.liquidity) ?? 0;
//       const bValue =
//         sortBy === "volume"
//           ? safeParseFloat(b.event.volume) ?? 0
//           : safeParseFloat(b.event.liquidity) ?? 0;
//       return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
//     })
//     .map((item) => item.event)
//     .slice(0, 20);
// }
