// types/market.ts
export interface BaseMarket {
  id: string;
  provider: MarketProvider;
  question: string;
  description: string;
  status: MarketStatus;
  expirationDate: string;
  timestamps: {
    created: string;
    updated?: string;
    resolved?: string;
  };
  collateral: {
    address: string;
    symbol: string;
    decimals: number;
  };
  metrics: {
    volume: string;
    volumeRaw: string;  
    liquidity: string;
    liquidityRaw: string; 
  };
  prices: {
    yes: { bid?: number; ask?: number };
    no: { bid?: number; ask?: number };
  };
  contract: {
    address: string;
    network: string;
  };
}

export interface LimitlessMarket extends BaseMarket {
  provider: 'LIMITLESS';
  conditionId: string;
}

export interface PolymarketMarket extends BaseMarket {
  provider: 'POLYMARKET';
  outcomeTokens: {
    yes: string;
    no: string;
  };
}

export interface OrderBook {
  yes: {
    bid?: number;
    ask?: number;
  };
  no: {
    bid?: number;
    ask?: number;
  };
}

export interface MarketCardProps {
  eventId: string;
  eventTitle: string;
  marketIndices: number[];
  marketSubTitles: string[];
}

export interface MarketCardState {
  market: Market | null;
  orderBook: OrderBook;
  sortedData: Array<{
    index: number;
    subtitle: string;
    liquidity: number;
  }>;
  showDetails: boolean;
  showMoneyline: boolean;
  loading: boolean;
  error: string | null;
}

export interface MarketCardActions {
  setActiveMarketIndex: (index: number) => void;
  setShowDetails: (show: boolean) => void;
  setShowMoneyline: (show: boolean) => void;
  handleBetClick: (position: "YES" | "NO") => void;
}

export interface Event {
  id: string;
  title: string;
  liquidity: number;
  volume: number;
  description?: string;
  markets: Market[];
  activeMarketsCount?: number;
}

export interface SearchParams {
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

export const MARKET_CONSTANTS = {
  MIN_LIQUIDITY: 100,
  MIN_ACTIVE_PRICE: 0.01,
  MAX_DEAD_PRICE: 0.99
} as const;