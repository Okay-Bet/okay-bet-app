import { MarketOutcome, MarketProvider, PositionStatus, Side } from "./core";

// Core Position Interfaces
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
    outcomes: string; 
    volume: string;
    liquidity: string;
    status: string;
    winning_outcome?: number;
    collateral_token: CollateralToken;
  };
  contract: {
    address: string;
  };
}

// Supporting Interfaces
export interface Transfer {
  id: string;
  from: string;
  to: string;
  value: string;
  event_id: string;
}

export interface PositionEvent {
  id: string;
  stakeholder: string;
  collateralToken: string;
  parentCollectionId: string;
  conditionId: string;
  partition: string[];
  amount: string;
}

export interface MarketCreationEvent {
  id: string;
  creator: string;
  fixedProductMarketMaker: string;
  conditionalTokens: string;
  collateralToken: string;
  conditionIds: string[];
  fee: string;
}

// export interface LimitlessMarket {
//   address: string;
//   conditionId: string;
//   title: string;
//   description: string;
//   status: string;
//   winningOutcomeIndex: number | null;
//   openInterest: string;
//   openInterestFormatted: string;
//   volume: string;
//   volumeFormatted: string;
//   liquidity: string;
//   liquidityFormatted: string;
//   expirationTimestamp: number;
//   collateralToken: CollateralToken;
// }

// UI Component Props
export interface PositionCardProps {
  position: Position;
  value: number;
  onRedeem: (
    tokenId: string,
    isYesToken: boolean,
    conditionId: string,
    parentCollectionId: string
  ) => Promise<void>;
}

// Utility Interfaces
export interface PositionValues {
  [tokenId: string]: number;
}

export interface PositionRequest {
  tokenId: string;
  amount: number;
  side: "BUY" | "SELL";
  isYesToken: boolean;
}

// export interface CollateralToken {
//   address: string;
//   decimals: number;
//   symbol: string;
// }

export interface ExtendedSubgraphResponse {
  data: {
    incomingTransfers: Transfer[];
    outgoingTransfers: Transfer[];
    markets: MarketCreationEvent[];
  };
}
