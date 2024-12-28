// types/market.ts

export interface Market {
    end_date_iso: string;
    condition_id: string;
    question: string;
    description?: string;
    resolutionSource?: string;
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
  
  export interface Event {
    id: string;
    title: string;
    liquidity: number;
    volume: number;
    description?: string;
    markets: Array<{
      id: string;
      question: string;
      liquidity: number;
    }>;
  }
  
  export interface SearchParams {
    searchTerm?: string;
    sortBy?: "volume" | "liquidity";
    sortDirection?: "asc" | "desc";
    endDateMin?: string;
    endDateMax?: string;
    volumeMin?: number;
    volumeMax?: number;
    liquidityMin?: number;
    liquidityMax?: number;
    limit?: number;
  }