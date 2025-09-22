/**
 * SPMC API Types
 * Based on SPMC API v1.0.0 Documentation
 */

// Configuration
export interface SPMCConfig {
  baseUrl: string;
  apiVersion: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Base Response Types
export interface SPMCResponse<T> {
  success: boolean;
  data?: T;
  error?: SPMCError;
  timestamp: string;
}

export interface SPMCError {
  status: number;
  message: string;
  endpoint?: string;
  timestamp?: string;
  details?: any;
}

// Platform Types - API uses lowercase
export type Platform = 'kalshi' | 'polymarket' | 'limitless';
export type PlatformUppercase = 'KALSHI' | 'POLYMARKET' | 'LIMITLESS';

// Market Types - Actual structure from API
export interface SPMCMarket {
  id: string;
  platform: Platform;
  platform_market_id: string;
  title: string;
  description?: string;
  rules?: string;
  status: 'active' | 'closed' | string;
  is_active: boolean;
  prices?: {
    bid: number | null;
    ask: number | null;
    last: number | null;
    mid: number;
    spread: number;
  };
  volume_24h?: number;
  liquidity?: number;
  open_interest?: number;
  updated_at?: string;
  created_at?: string;
  expiration_date?: string;
  slug?: string;
  event_ticker?: string;
  metrics?: SPMCMarketMetrics;
}

export interface SPMCPriceData {
  yes?: {
    bid?: number;
    ask?: number;
    last?: number;
  };
  no?: {
    bid?: number;
    ask?: number;
    last?: number;
  };
  timestamp?: string;
}

export interface SPMCMarketMetrics {
  volume: string;
  volumeRaw: string;
  liquidity: string;
  liquidityRaw: string;
  openInterest: string;
  openInterestRaw: string;
  volume24h?: number;
  volumeChange24h?: number;
}

// Ticker Types
export interface SPMCTicker {
  marketId: string;
  platform: Platform;
  lastPrice: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: string;
}

// Group Types
export interface SPMCGroup {
  id: string;
  title: string;
  description?: string;
  group_type: 'watchlist' | 'portfolio' | 'index' | 'arbitrage' | 'correlated' | 'inverse' | 'same_event';
  is_system_generated: boolean;
  is_template: boolean;
  template_name?: string | null;
  metadata?: Record<string, any>;
  display_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  market_count: number;
  markets: SPMCGroupMarket[];
}

export interface SPMCGroupMarket {
  id: string;
  market_id: string;
  weight: number;
  position_type: string;
  metadata?: Record<string, any>;
  added_at: string;
  updated_at: string;
  market_title?: string;
  market_platform?: Platform;
  market_current_price?: number | null;
}

// Stats Types
export interface SPMCGlobalStats {
  totalVolume: number;
  totalMarkets: number;
  activeMarkets: number;
  totalLiquidity: number;
  platformBreakdown: {
    [key in Platform]?: {
      markets: number;
      volume: number;
      liquidity: number;
    };
  };
  timestamp: string;
}

export interface SPMCHealthScore {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    api: boolean;
    database: boolean;
    cache: boolean;
    providers: {
      [key in Platform]?: boolean;
    };
  };
  timestamp: string;
}

// Request Types
export interface SPMCMarketsRequest {
  limit?: number;
  offset?: number;
  platform?: Platform;
  status?: string;
  sortBy?: 'volume' | 'liquidity' | 'created' | 'expiration';
  sortOrder?: 'asc' | 'desc';
  minVolume?: number;
  maxVolume?: number;
  search?: string;
}

export interface SPMCSearchRequest {
  query: string;
  platforms?: Platform[];
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
}

export interface SPMCPricesRequest {
  marketIds: string[];
  platforms?: Platform[];
}

export interface SPMCQuotesRequest {
  marketIds: string[];
  side: 'YES' | 'NO';
  amount?: number;
}

// Response Types
export interface SPMCMarketsResponse {
  markets: SPMCMarket[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SPMCSearchResponse {
  results: SPMCMarket[];
  query: string;
  totalResults: number;
}

export interface SPMCPricesResponse {
  prices: {
    [marketId: string]: SPMCPriceData;
  };
  timestamp: string;
}

// Market metrics for consolidated view
export interface ConsolidatedMarketMetrics {
  id: string;
  volume: number;
  liquidity?: number;
  openInterest?: number;
}

// Consolidated Market (for grouped markets)
export interface SPMCConsolidatedMarket {
  id: string;
  title: string;
  status: string;
  metrics: {
    platforms: {
      kalshi?: { markets: ConsolidatedMarketMetrics[] };
      limitless?: { markets: ConsolidatedMarketMetrics[] };
      polymarket?: { markets: ConsolidatedMarketMetrics[] };
    };
    totalVolume: number;
    highestLiquidity: number;
  };
  kalshiMarkets?: Record<string, SPMCMarket>;
  polymarketMarkets?: Record<string, SPMCMarket>;
  limitlessMarkets?: Record<string, SPMCMarket>;
}