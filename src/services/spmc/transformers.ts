/**
 * SPMC Data Transformers
 * Transform SPMC API responses to match existing app data structures
 */

import {
  SPMCMarket,
  SPMCConsolidatedMarket,
  Platform
} from './types';

import {
  KalshiMarket,
  PolymarketMarket,
  LimitlessMarket,
  GroupedMarketCard
} from '@/components/types/market';
import { MarketStatus } from '@/components/types/core';

/**
 * Transform SPMC market to Kalshi market format
 */
export function transformToKalshiMarket(market: SPMCMarket): KalshiMarket {
  return {
    id: market.id,
    provider: 'KALSHI',
    question: market.title,
    description: market.description || '',
    ticker: market.event_ticker || market.platform_market_id || market.id,
    category: market.event_ticker || 'general',
    status: market.status === 'active' ? 'ACTIVE' : market.status.toUpperCase() as MarketStatus,
    expirationDate: market.expiration_date || '',
    timestamps: {
      created: market.created_at || new Date().toISOString(),
      updated: market.updated_at || new Date().toISOString(),
    },
    collateral: {
      address: '',
      symbol: 'USD',
      decimals: 2,
    },
    metrics: market.metrics || {
      volume: String(market.volume_24h || 0),
      volumeRaw: String(market.volume_24h || 0),
      liquidity: String(market.liquidity || 0),
      liquidityRaw: String(market.liquidity || 0),
      openInterest: String(market.open_interest || 0),
      openInterestRaw: String(market.open_interest || 0),
    },
    volume24H: market.metrics?.volume24h || market.volume_24h || 0,
    prices: {
      yes: {
        bid: market.prices?.bid ?? undefined,
        ask: market.prices?.ask ?? undefined,
      },
      no: {
        bid: market.prices?.bid != null ? 1 - market.prices.bid : undefined,
        ask: market.prices?.ask != null ? 1 - market.prices.ask : undefined,
      },
    },
    contract: {
      address: market.id,
      network: 'kalshi',
    },
    openInterest: market.open_interest || 0,
  };
}

/**
 * Transform SPMC market to Polymarket format
 */
export function transformToPolymarketMarket(market: SPMCMarket): PolymarketMarket {
  return {
    id: market.id,
    provider: 'POLYMARKET',
    question: market.title,
    description: market.description || '',
    slug: market.slug || market.id,
    status: 'ACTIVE',
    expirationDate: market.expiration_date || market.market_close_time || market.closes_at || '',
    timestamps: {
      created: market.created_at || new Date().toISOString(),
    },
    collateral: {
      address: '',
      symbol: 'USDC',
      decimals: 6,
    },
    metrics: market.metrics || {
      volume: String(market.volume_24h || 0),
      volumeRaw: String(market.volume_24h || 0),
      liquidity: String(market.liquidity || 0),
      liquidityRaw: String(market.liquidity || 0),
      openInterest: String(market.open_interest || 0),
      openInterestRaw: String(market.open_interest || 0),
    },
    prices: {
      yes: {
        bid: market.prices?.bid ?? undefined,
        ask: market.prices?.ask ?? undefined,
      },
      no: {
        bid: market.prices?.bid != null ? 1 - market.prices.bid : undefined,
        ask: market.prices?.ask != null ? 1 - market.prices.ask : undefined,
      },
    },
    contract: {
      address: market.id,
      network: 'polygon',
    },
    outcomeTokens: {
      yes: '',
      no: '',
    },
    yesBestAsk: market.prices?.ask ?? undefined,
    noBestAsk: market.prices?.ask != null ? 1 - market.prices.ask : undefined,
    yesBestBid: market.prices?.bid ?? undefined,
    noBestBid: market.prices?.bid != null ? 1 - market.prices.bid : undefined,
  };
}

/**
 * Transform SPMC market to Limitless format
 */
export function transformToLimitlessMarket(market: SPMCMarket): LimitlessMarket {
  return {
    id: market.id,
    provider: 'LIMITLESS',
    question: market.title,
    description: market.description || '',
    status: (market.status as MarketStatus) || 'ACTIVE',
    slug: market.slug || market.id,
    expirationDate: market.expiration_date || market.market_close_time || market.closes_at || '',
    timestamps: {
      created: market.created_at || new Date().toISOString(),
      updated: market.updated_at || new Date().toISOString(),
    },
    collateral: {
      address: '',
      symbol: '$',
      decimals: 18,
    },
    metrics: market.metrics || {
      volume: String(market.volume_24h || 0),
      volumeRaw: String(market.volume_24h || 0),
      liquidity: String(market.liquidity || 0),
      liquidityRaw: String(market.liquidity || 0),
      openInterest: String(market.open_interest || 0),
      openInterestRaw: String(market.open_interest || 0),
    },
    prices: {
      yes: {
        bid: market.prices?.bid ?? undefined,
        ask: market.prices?.ask ?? undefined,
      },
      no: {
        bid: market.prices?.bid != null ? 1 - market.prices.bid : undefined,
        ask: market.prices?.ask != null ? 1 - market.prices.ask : undefined,
      },
    },
    contract: {
      address: market.id,
      network: 'base',
    },
    conditionId: market.id,
  };
}

/**
 * Transform SPMC market to appropriate platform-specific format
 */
export function transformMarketData(market: SPMCMarket) {
  switch (market.platform) {
    case 'kalshi':
      return transformToKalshiMarket(market);
    case 'polymarket':
      return transformToPolymarketMarket(market);
    case 'limitless':
      return transformToLimitlessMarket(market);
    default:
      // Default to Polymarket format for unknown platforms
      return transformToPolymarketMarket(market);
  }
}

/**
 * Transform SPMC consolidated market to GroupedMarketCard format
 */
export function transformConsolidatedMarket(
  consolidated: SPMCConsolidatedMarket
): GroupedMarketCard {
  const limitlessMarkets = consolidated.limitlessMarkets
    ? Object.values(consolidated.limitlessMarkets).map((market) => ({
        market: transformToLimitlessMarket(market),
        similarity: 1,
      }))
    : [];

  const polymarketMarkets = consolidated.polymarketMarkets
    ? Object.values(consolidated.polymarketMarkets).map((market) => ({
        market: transformToPolymarketMarket(market),
        similarity: 1,
      }))
    : [];

  const kalshiMarkets = consolidated.kalshiMarkets
    ? Object.values(consolidated.kalshiMarkets).map((market) => ({
        market: transformToKalshiMarket(market),
        similarity: 1,
      }))
    : [];

  // Transform platform metrics to match expected structure
  const metrics = {
    totalVolume: consolidated.metrics.totalVolume,
    highestLiquidity: consolidated.metrics.highestLiquidity,
    platforms: {
      limitless: {
        markets: consolidated.metrics.platforms.limitless?.markets.map(m => ({
          id: m.id,
          volume: m.volume,
          openInterest: m.openInterest || 0,
        })) || []
      },
      polymarket: {
        markets: consolidated.metrics.platforms.polymarket?.markets.map(m => ({
          id: m.id,
          volume: m.volume,
          liquidity: m.liquidity || 0,
        })) || []
      },
      kalshi: {
        markets: consolidated.metrics.platforms.kalshi?.markets.map(m => ({
          id: m.id,
          volume: m.volume,
          liquidity: m.liquidity || 0,
          openInterest: m.openInterest || 0,
        })) || []
      },
    }
  };

  return {
    id: consolidated.id,
    title: consolidated.title,
    metrics,
    limitlessMarkets,
    polymarketMarkets,
    kalshiMarkets,
  };
}

/**
 * Transform array of SPMC consolidated markets
 */
export function transformConsolidatedMarkets(
  markets: SPMCConsolidatedMarket[]
): GroupedMarketCard[] {
  return markets.map(transformConsolidatedMarket);
}