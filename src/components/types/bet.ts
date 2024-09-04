export interface BetDetailsType {
  address: string;
  maker: string;
  makerDisplay: string;
  taker: string;
  takerDisplay: string;
  judge: string;
  judgeDisplay: string;
  wagerWei: string;
  wagerEth: string;
  wagerCurrency: string;
  conditions: string;
  status: number;
  winner: string | null;
  winnerDisplay: string | null;
  expirationBlock: number;
  wagerRatio: number;
}