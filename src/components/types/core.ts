// src/types/core.ts
export type MarketProvider = 'POLYMARKET' | 'LIMITLESS';
export type MarketOutcome = 'YES' | 'NO';
export type MarketStatus = 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
export type Side = 'BUY' | 'SELL';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'PENDING' | 'FAILED';
export type ChainId = number;