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
  market_close_time?: string; // From search results
  closes_at?: string; // From single market endpoint
  slug?: string;
  event_ticker?: string;
  metrics?: SPMCMarketMetrics;
}

// Legacy price data structure (kept for backwards compatibility)
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

// Actual batch price response structure from SPMC API
export interface SPMCBatchPriceData {
  platform: Platform;
  platform_market_id?: string;
  status: string;
  prices: {
    bid: number | null;
    ask: number | null;
    last: number | null;
    mid: number;
  };
  updated_at: string;
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
  outcome?: 'yes' | 'no' | 'both';  // Specify yes/no outcome
  metadata?: Record<string, any>;
  added_at: string;
  updated_at: string;
  market_title?: string;
  market_platform?: Platform;
  market_current_price?: number | null;
  market_expiration_date?: string;
  market_close_time?: string;
  market_closes_at?: string;
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
  status?: string;
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

export interface SPMCHistoryRequest {
  marketId: string;
  interval?: '1m' | '1h' | '6h' | '1d' | '1w' | 'max';
  fidelity?: number; // Resolution in minutes (1-1440)
  startTime?: number; // Unix timestamp (UTC)
  endTime?: number; // Unix timestamp (UTC)
}

export interface SPMCHistoryDataPoint {
  t: number; // Unix timestamp
  p: number; // Price
}

export interface SPMCHistoryResponse {
  market_id: string;
  platform: Platform;
  history: {
    history: SPMCHistoryDataPoint[];
  };
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
  markets: SPMCMarket[];
  results?: SPMCMarket[]; // Keep for backwards compatibility
  query: string;
  totalResults: number;
}

export interface SPMCPricesResponse {
  prices: {
    [marketId: string]: SPMCBatchPriceData;
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

// Agent Types
export type AgentCharacter = 'pamela' | 'lib-out' | 'chalk-eater' | 'nothing-ever-happens' | 'trumped-up';
export type DeploymentTarget = 'local' | 'tee';
export type DeploymentStatus = 'pending' | 'queued' | 'cloning' | 'building' | 'deploying' | 'deployed' | 'ready' | 'failed';
export type TradingStrategy = 'custom_model' | 'spmc_index';
export type RebalanceDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

// Trading configuration - supports both custom model and index strategies
export interface AgentTradingConfig {
  trading_strategy: TradingStrategy;

  // Custom model strategy fields (optional, used when trading_strategy = 'custom_model')
  max_position_size?: number; // 1-10000, max $ per position
  min_confidence_threshold?: number; // 0.0-1.0, minimum confidence to trade
  unsupervised_mode?: boolean; // true = auto-trade, false = require approval

  // SPMC index strategy fields (required when trading_strategy = 'spmc_index')
  spmc_index_id?: string; // Group ID to use as index
  index_rebalance_day?: RebalanceDay; // Day of week to rebalance
  index_rebalance_hour?: number; // Hour (0-23) to rebalance
}

// Legacy type alias for backward compatibility
export type TradingConfig = AgentTradingConfig;

export interface SPMCAgent {
  agent_id: string;
  group_id: string;
  agent_character: AgentCharacter;
  git_tag: string;
  git_commit_sha: string | null;
  wallet_address: string | null;
  telegram_bot_id: string;
  telegram_chat_id: string | null;
  deployment_status: DeploymentStatus;
  deployment_target: DeploymentTarget;
  tee_endpoint: string | null;
  local_port: number | null;
  container_id: string | null;
  deployed_at: string | null;
  wallet_retrieved_at: string | null;
  whitelisted_at: string | null;
  trading_config: TradingConfig;
  error_message: string | null;
}

export interface CreateAgentRequest {
  group_id: string;
  agent_character?: AgentCharacter;
  git_tag: string;
  deployment_target?: DeploymentTarget;
  telegram_bot_id: string;
  telegram_chat_id?: string;
  trading_config: TradingConfig;
}

export interface ContainerStats {
  container_id: string;
  name: string;
  status: 'running' | 'exited' | 'paused';
  created: string;
  memory_usage_mb: number;
  memory_limit_mb: number;
  memory_percent: number;
  cpu_usage: {
    total_usage: number;
    usage_in_kernelmode: number;
    usage_in_usermode: number;
  };
}

export interface AgentDeploymentStatusResponse {
  agent_id: string;
  group_id: string;
  git_tag: string;
  git_commit_sha: string | null;
  deployment_status: DeploymentStatus;
  tee_endpoint: string | null;
  deployed_at: string | null;
  error_message: string | null;
  container_status: ContainerStats | null;
}

export interface AgentContainerStatusResponse {
  agent_id: string;
  group_id: string;
  deployment_target: DeploymentTarget;
  deployment_status: DeploymentStatus;
  git_tag: string;
  git_commit_sha: string | null;
  deployed_at: string | null;
  endpoint: string | null;
  local_port: number | null;
  container_id: string | null;
  container_stats: ContainerStats | null;
}

export interface AgentLogsResponse {
  agent_id: string;
  container_id: string;
  logs: string;
  tail: number;
}

export interface CapacityInfo {
  active_agents: number;
  max_agents: number;
  available_slots: number;
  at_capacity: boolean;
  active_agent_characters: AgentCharacter[];
}

export interface QueueStatus {
  queue_length: number;
  is_deploying: boolean;
  current_deployment: {
    agent_id: string;
    started_at: string;
  } | null;
}

export interface DiskUsageInfo {
  images_size: string;
  containers_size: string;
  volumes_size: string;
  total_size: string;
  total_reclaimable: string;
}