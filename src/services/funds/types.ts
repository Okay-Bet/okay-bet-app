export enum FundPhase {
  DEPOSIT = 0,
  TRADING = 1,
  REDEMPTION = 2,
  COMPLETED = 3
}

export interface Fund {
  address: string;
  name: string;
  manager: string;
  agent: string;
  targetRaise: bigint;
  minInvestment: bigint;
  entryFee: number; // basis points
  carriedInterest: number; // basis points
  depositDeadline: Date;
  tradingDuration: number; // seconds
  currentPhase: FundPhase;
  totalDeposits: bigint;
  finalFundValue?: bigint;
  totalProfit?: bigint;
}

export interface FundMetrics {
  totalDeposits: bigint;
  targetRaise: bigint;
  progressPercentage: number;
  currentPhase: FundPhase;
  depositDeadline: Date;
  tradingEndTime?: Date;
  totalSupply: bigint; // Total share tokens
  finalNAVPerShare?: bigint;
}

export interface UserPosition {
  fundAddress: string;
  shares: bigint;
  depositAmount: bigint;
  currentValue?: bigint;
  profit?: bigint;
}

export interface CreateFundParams {
  fundName: string;
  agentWallet: string;
  targetRaise: bigint; // Min: 1000 USDC (1000 * 10^6)
  tradingDuration: number; // In seconds, min: 1 day, max: 365 days
  entryFee: number; // Basis points (100 = 1%), max: 500
  carriedInterest: number; // Basis points (2000 = 20%), max: 5000
  minInvestment: bigint; // Min: 5 USDC (5 * 10^6)
  depositDeadline: number; // Unix timestamp
}

export interface FundFactoryConfig {
  factoryAddress: string;
  usdcAddress: string;
  chainId: number;
  rpcUrl: string;
}

export const USDC_DECIMALS = 6;
export const MIN_INVESTMENT_USDC = 5; // 5 USDC minimum
export const MIN_TARGET_RAISE_USDC = 1000; // 1000 USDC minimum
export const MAX_ENTRY_FEE_BP = 500; // 5% max
export const MAX_CARRIED_INTEREST_BP = 5000; // 50% max
export const MIN_TRADING_DURATION = 86400; // 1 day in seconds
export const MAX_TRADING_DURATION = 31536000; // 365 days in seconds

// Helper functions for conversions
export function usdcToWei(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
}

export function weiToUsdc(amount: bigint): number {
  return Number(amount) / 10 ** USDC_DECIMALS;
}

export function basisPointsToPercentage(bp: number): number {
  return bp / 100;
}

export function percentageToBasisPoints(percentage: number): number {
  return Math.floor(percentage * 100);
}

export function getPhaseName(phase: FundPhase): string {
  switch (phase) {
    case FundPhase.DEPOSIT:
      return 'Deposit';
    case FundPhase.TRADING:
      return 'Trading';
    case FundPhase.REDEMPTION:
      return 'Redemption';
    case FundPhase.COMPLETED:
      return 'Completed';
    default:
      return 'Unknown';
  }
}

export function getPhaseColor(phase: FundPhase): string {
  switch (phase) {
    case FundPhase.DEPOSIT:
      return 'bg-blue-100 text-blue-700';
    case FundPhase.TRADING:
      return 'bg-yellow-100 text-yellow-700';
    case FundPhase.REDEMPTION:
      return 'bg-green-100 text-green-700';
    case FundPhase.COMPLETED:
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}