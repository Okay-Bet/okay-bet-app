// types/bet.ts
export interface BetDetailsType {
  address: string;
  maker: string;
  makerDisplay: string;
  taker: string;
  takerDisplay: string;
  judge: string;
  judgeDisplay: string;
  totalWager: string;
  wagerRatio: number;
  conditions: string;
  status: number;
  winner: string | null;
  winnerDisplay: string | null;
  expirationBlock: number;
  finalized: boolean;
  wagerCurrency: string;
}