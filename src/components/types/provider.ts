import { MarketProvider } from "./core";
import { BaseMarket } from "./market";
import { PositionRequest } from "./position"; 
import { ValidationResult } from "./validation";

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
  
  // export interface IPositionProvider {
  //   validatePosition(request: PositionRequest): Promise<ValidationResult>;
  //   createPosition(request: PositionRequest): Promise<Position>;
  //   closePosition(positionId: string): Promise<Position>;
  //   getPositions(address: string): Promise<Position[]>;
  //   getPosition(positionId: string): Promise<Position>;
  //   getQuote(request: PositionRequest): Promise<{
  //     estimatedCost: bigint;
  //     estimatedTokens: bigint;
  //     priceImpact: number;
  //   }>;
  // }