import { MarketOutcome, MarketProvider, PositionStatus, Side } from "./core";

// src/types/position.ts
export interface Position {
  condition_id: string;
  token_id: string;
  parent_collection_id: string;
  balance: number;
  current_balance: number;
  outcome: number;
  status: string;
  expiration_timestamp: number;
  user_address: string;
  transaction_hash: string;
  is_winner?: boolean;
  market_data: {
    question: string;
    description: string;
    outcomes: string;  // JSON string of outcomes array
    volume: string;
    liquidity: string;
    status: string;
    winning_outcome?: number;
    collateral_token: {
      address: string;
      decimals: number;
      symbol: string;
    };
  };
  contract: {
    address: string;
  };
}

// export interface PositionRequest {
//   marketId: string;
//   provider: MarketProvider;
//   outcome: MarketOutcome;
//   side: Side;
//   amount: bigint;
//   maxSlippage: number;
//   referralCode?: string;
// }

export interface PositionCardProps {
  position: Position;  // Updated to use our API-matching Position type
  value: number;
  // onSell: (tokenId: string, amount: number, isYesToken: boolean, price: number) => Promise<void>;
  onRedeem: (tokenId: string, isYesToken: boolean, conditionId: string, parentCollectionId: string) => Promise<void>;
}

export interface PositionValues {
  [tokenId: string]: number;
}

export interface PositionRequest {
  tokenId: string;
  amount: number;
  side: "BUY" | "SELL";
  isYesToken: boolean;
}