// types/position.ts
export interface Position {
  market_id: string;
  token_id: string;
  market_question: string;
  outcomes: string[];
  prices: number[];
  balances: number[];
  entry_prices?: number[] | null;
  timestamp?: string | null;
}