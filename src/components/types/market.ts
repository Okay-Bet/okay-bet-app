// types/market.ts

export interface MarketQueryParams {
    eventId: string;
    marketIndex: number;
    sortBy?: 'liquidity' | 'volume' | 'created';
    sortDirection?: 'asc' | 'desc';
    searchTerm?: string;
  }
  
  export interface Market {
    id: string;
    question: string;
    description?: string;
    resolutionSource?: string;
    end_date_iso: string;
    condition_id: string;
    volume_num: number;
    liquidity_num: number;
    bestAsk?: number;
    active?: boolean;
    tokens: {
      yes: {
        token_id: string;
        outcome: string;
      };
      no: {
        token_id: string;
        outcome: string;
      };
    };
  }
  
  export interface MarketResponse {
    market: Market | null;
    marketLiquidities: number[];
    error?: string;
  }