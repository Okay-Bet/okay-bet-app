// types/bet.ts

export interface Bet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: 'YES' | 'NO';
  price: number;
}