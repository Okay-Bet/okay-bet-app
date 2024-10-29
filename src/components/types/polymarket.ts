// types/polymarket.ts

export type MarketParams = {
  limit?: number;
  active?: boolean;
  closed?: boolean;
  liquidity_num_min?: number;
  volume_num_min?: number;
};

export interface PredictionMarketsProps {
  searchParams?: MarketParams;
}

export interface MarketCardProps {
  market: Market;
}

export interface ErrorStateProps {
  message: string;
}

export interface CollateralToken {
  symbol: string;
  decimals: number;
}

export interface Condition {
  id: string;
  oracle: string;
  questionId: string;
  outcomeSlotCount: number;
  resolutionTimestamp: string | null;
  payouts: number[] | null;
}

export interface FixedProductMarketMaker {
  id: string;
  creationTimestamp: string;
  collateralToken: CollateralToken;
  scaledCollateralVolume: string;
  scaledLiquidityParameter: string;
  conditions: Condition[];
  outcomeTokenPrices: number[];
  outcomeTokenAmounts: string[];
  totalSupply: string;
  lastActiveDay: string;
  tradesQuantity: string;
}


export interface Outcome {
  id: string;
  index: string;
  complement: string;
}

export type Market = {
  id: string;
  question: string;
  liquidity_num: number;
  volume_num: number;
  condition_id: string;
  active: boolean;
  closed: boolean;
  enableOrderBook: boolean;
  bestBid?: number;
  bestAsk?: number;
  end_date_iso?: string;
  outcomes?: Outcome[];
  oracle?: string;
};
