// types/position.ts
export interface MarketData {
  question: string;
  outcomes: string;  
  outcome_prices: string;
}

export interface Position {
  condition_id: string;
  user_address: string;
  outcome: number;
  amount: number;
  average_entry_price: number;
  unrealized_pnl: number | null;
  realized_pnl: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  market_data?: MarketData;
}