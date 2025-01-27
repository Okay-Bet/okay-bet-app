import { MarketOutcome, MarketProvider, PositionStatus, Side } from "./core";

// src/types/position.ts
export interface BasePosition {
  id: string;
  marketId: string;
  provider: MarketProvider;
  userAddress: string;
  outcome: MarketOutcome;
  side: Side;
  amount: bigint;
  entryPrice: number;
  status: PositionStatus;
  timestamps: {
    created: string;
    updated?: string;
    closed?: string;
  };
  pnl: {
    unrealized: number | null;
    realized: number;
  };
  metadata: Record<string, unknown>;
}

export interface PositionRequest {
  marketId: string;
  provider: MarketProvider;
  outcome: MarketOutcome;
  side: Side;
  amount: bigint;
  maxSlippage: number;
  referralCode?: string;
}

export interface PositionCardProps {
  position: BasePosition;
  value: number;
  onSell: (tokenId: string, amount: number, isYesToken: boolean, price: number) => Promise<void>;
  onRedeem: (tokenId: string) => Promise<void>;
  sellLoading: boolean;
}

export interface PositionValues {
  [tokenId: string]: number;
}