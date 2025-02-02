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
  winning_outcome?: number;
  isRedeemed: boolean; 
  position_result?: "won" | "lost";
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

export interface Trade {
  id: string;
  outcomeIndex: string;
  investmentAmount?: string; // for buy trades
  returnAmount?: string; // for sell trades
  buyer?: string; // for buy trades
  seller?: string; // for sell trades
  outcomeTokensBought?: string;
  outcomeTokensSold?: string;
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
interface PositionCardProps {
  position: Position;
  value: number;
  outcome: string;
  result?: string;
  onRedeem: (
    tokenId: string,
    isYesToken: boolean,
    conditionId: string,
    parentCollectionId: string
  ) => Promise<void>;
  canRedeem: boolean;
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

export interface RedemptionInfo {
  conditionId: string;
  payout: string;
  redeemer: string;
}

export interface ExtendedSubgraphResponse {
  data: {
    trades: never[];
    incomingTransfers: Transfer[];
    outgoingTransfers: Transfer[];
    markets: MarketCreationEvent[];
  };
}
