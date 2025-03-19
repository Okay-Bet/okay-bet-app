// types/bet.ts

export interface BaseBet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
}

export interface LimitlessBet extends BaseBet {
  provider: "LIMITLESS";
  tokenId: string;
}

export interface PolymarketBet extends BaseBet {
  provider: "POLYMARKET";
  slug: string;
}

export interface KalshiBet extends BaseBet {
  provider: "KALSHI";
  ticker: string;
}

export type Bet = LimitlessBet | PolymarketBet | KalshiBet;