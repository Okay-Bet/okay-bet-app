// src/types/provider.ts
export interface IMarketProvider {
    getName(): MarketProvider;
    getMarkets(): Promise<BaseMarket[]>;
    getMarket(id: string): Promise<BaseMarket>;
    getPrices(id: string): Promise<{
      yes: { bid?: number; ask?: number };
      no: { bid?: number; ask?: number };
    }>;
  }
  
  export interface IPositionProvider {
    validatePosition(request: PositionRequest): Promise<ValidationResult>;
    createPosition(request: PositionRequest): Promise<BasePosition>;
    closePosition(positionId: string): Promise<BasePosition>;
    getPositions(address: string): Promise<BasePosition[]>;
    getPosition(positionId: string): Promise<BasePosition>;
    getQuote(request: PositionRequest): Promise<{
      estimatedCost: bigint;
      estimatedTokens: bigint;
      priceImpact: number;
    }>;
  }