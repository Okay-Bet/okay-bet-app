/**
 * Index Price Calculation Service
 *
 * Calculates weighted average prices for market indexes using SPMC batch price API.
 * Supports all platforms (Polymarket, Kalshi, Limitless).
 *
 * YES/NO Handling:
 * - For YES outcomes (or unspecified), use mid price directly
 * - For NO outcomes, calculate as 1 - mid price (inverse position)
 * - This works because YES price + NO price = 1.0 in prediction markets
 */

import { spmcClient } from './client';
import { SPMCGroupMarket, Platform } from './types';

export interface IndexPriceData {
  currentPrice: number;
  markets: Array<{
    id: string;
    platform: Platform;
    weight: number;
    outcome?: 'yes' | 'no' | 'both';
    currentPrice: number | null;
    bid?: number | null;
    ask?: number | null;
    last?: number | null;
    mid?: number | null;
  }>;
  totalWeight: number;
  validMarketsCount: number;
  totalMarketsCount: number;
  timestamp: string;
}

/**
 * Calculate the weighted average price for an index based on its markets
 */
export async function calculateIndexPrice(
  markets: SPMCGroupMarket[]
): Promise<IndexPriceData> {
  if (!markets || markets.length === 0) {
    throw new Error('No markets provided for index price calculation');
  }

  // Extract market IDs for batch price fetch
  const marketIds = markets.map(m => m.market_id);

  // Fetch batch prices from SPMC
  const pricesResponse = await spmcClient.getMarketPrices({
    marketIds,
  });

  if (!pricesResponse.success || !pricesResponse.data) {
    throw new Error('Failed to fetch market prices from SPMC');
  }

  const { prices, timestamp } = pricesResponse.data;

  // Process each market and calculate weighted prices
  const processedMarkets = markets.map(market => {
    const batchPriceData = prices[market.market_id];

    let currentPrice: number | null = null;
    let bid: number | null = null;
    let ask: number | null = null;
    let last: number | null = null;
    let mid: number | null = null;

    if (batchPriceData && batchPriceData.prices) {
      const priceData = batchPriceData.prices;

      // Extract raw price data
      bid = priceData.bid;
      ask = priceData.ask;
      last = priceData.last;
      mid = priceData.mid;

      // Use mid price as the base price (average of bid/ask)
      const basePrice = mid;

      // Handle YES/NO outcomes
      const outcome = market.outcome || 'yes';
      if (outcome === 'no') {
        // For NO positions, price is inverse of YES price
        currentPrice = 1 - basePrice;
        // Inverse bid/ask as well
        if (bid !== null && ask !== null) {
          const inverseBid = 1 - ask;  // NO bid = 1 - YES ask
          const inverseAsk = 1 - bid;  // NO ask = 1 - YES bid
          bid = inverseBid;
          ask = inverseAsk;
        }
        mid = currentPrice;
      } else {
        // For YES positions, use price directly
        currentPrice = basePrice;
      }
    }

    return {
      id: market.market_id,
      platform: market.market_platform as Platform,
      weight: market.weight || 1,
      outcome: market.outcome,
      currentPrice,
      bid,
      ask,
      last,
      mid,
    };
  });

  // Calculate weighted average from valid prices
  const validMarkets = processedMarkets.filter(m => m.currentPrice !== null);

  if (validMarkets.length === 0) {
    return {
      currentPrice: 0,
      markets: processedMarkets,
      totalWeight: 0,
      validMarketsCount: 0,
      totalMarketsCount: markets.length,
      timestamp,
    };
  }

  // Calculate total weight from valid markets only
  const totalWeight = validMarkets.reduce((sum, m) => sum + m.weight, 0);

  // Calculate weighted average price
  const weightedPrice = validMarkets.reduce((sum, m) => {
    const normalizedWeight = m.weight / totalWeight;
    return sum + (m.currentPrice as number) * normalizedWeight;
  }, 0);

  return {
    currentPrice: weightedPrice,
    markets: processedMarkets,
    totalWeight,
    validMarketsCount: validMarkets.length,
    totalMarketsCount: markets.length,
    timestamp,
  };
}

/**
 * Calculate index price change over time by comparing current price to historical
 */
export function calculateIndexPriceChange(
  currentPrice: number,
  historicalPrice: number
): {
  change: number;
  changePercent: number;
} {
  const change = currentPrice - historicalPrice;
  const changePercent = historicalPrice !== 0
    ? (change / historicalPrice) * 100
    : 0;

  return {
    change,
    changePercent,
  };
}

/**
 * Validate that markets have required fields for price calculation
 */
export function validateMarketsForPricing(markets: SPMCGroupMarket[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!markets || markets.length === 0) {
    errors.push('No markets provided');
  }

  markets.forEach((market, index) => {
    if (!market.market_id) {
      errors.push(`Market at index ${index} missing market_id`);
    }
    if (!market.market_platform) {
      errors.push(`Market at index ${index} missing market_platform`);
    }
    if (market.weight !== undefined && market.weight < 0) {
      errors.push(`Market at index ${index} has negative weight`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
