// types/bet.ts

export interface BaseBet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
  groupId: string;
}

export interface LimitlessBet extends BaseBet {
  provider: "LIMITLESS";
  tokenId: string;
}

export interface PolymarketBet extends BaseBet {
  provider: "POLYMARKET";
  slug: string;
}

export type Bet = LimitlessBet | PolymarketBet;