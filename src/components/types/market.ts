// types/market.ts
import { MarketProvider, MarketStatus } from "./core";
import { Market } from "./polymarket";

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
    openInterest: string;
    openInterestRaw: string;
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
  provider: "LIMITLESS";
  conditionId: string;
}

export interface PolymarketMarket extends BaseMarket {
  provider: "POLYMARKET";
  slug: string;
  outcomeTokens: {
    yes: string;
    no: string;
  };
  yesBestAsk?: number;
  noBestAsk?: number;
  yesBestBid?: number;
  noBestBid?: number;
  liquidity_num?: number;
  volume_num?: number;
}

export interface KalshiMarket extends BaseMarket {
  provider: "KALSHI";
  ticker: string;
  category: string; 
  status: MarketStatus;
  openInterest: number;
  volume24H?: number;
  yesBestAsk?: number;
  noBestAsk?: number;
  yesBestBid?: number;
  noBestBid?: number;
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
  markets: LimitlessMarket[];
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
  markets: (LimitlessMarket | PolymarketMarket | KalshiMarket)[];
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
  MAX_DEAD_PRICE: 0.99,
} as const;

export interface GroupedMarketIds {
  id: string; // GroupedMarket id
  limitlessId: string;
  polymarketMatches: {
    id: string; // Polymarket id
    similarity: number;
  }[];
}

export interface GroupedMarketsResponse {
  success: boolean;
  data: GroupedMarketIds[];
  error?: string;
}

export interface GroupedMarketCard {
  id: string;
  limitlessMarkets: {
    market: LimitlessMarket;
    similarity: number | null;
  }[];
  polymarketMarkets: {
    market: PolymarketMarket;
    similarity: number | null;
  }[];
  kalshiMarkets: {
    market: KalshiMarket;
    similarity: number | null;
  }[];
  metrics: {
    totalVolume: number;
    highestLiquidity: number;
    platforms: {
      limitless: {
        markets: Array<{
          id: string;
          volume: number;
          openInterest: number;
        }>;
      };
      polymarket: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
        }>;
      };
      kalshi: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
          openInterest: number;
        }>;
      };
    };
  };
}

export interface GroupedMarketsResponse {
  success: boolean;
  data: GroupedMarketCard[];
  error?: string;
}
