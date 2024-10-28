// types/polymarket.ts
export type Market = {
    id: string;
    question: string;
    active: boolean;
    current_price?: number;
    volume_num?: number;
    liquidity_num?: number;
    end_date?: string;
  };
  
  export type MarketParams = {
    tag?: string;
    keyword?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
    marketId?: string;
    minVolume?: number;
    maxVolume?: number;
    minLiquidity?: number;
    maxLiquidity?: number;
  };
  
  export interface PredictionMarketsProps {
    searchParams?: MarketParams;
  }
  
  export interface MarketCardProps {
    market: Market;
  }
  
  export interface ErrorStateProps {
    message: string;
  }