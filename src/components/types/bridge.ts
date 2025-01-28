// src/types/bridge.ts

export interface AcrossQuote {
    deposit: {
      inputAmount: string;
      outputAmount: string;
      recipient: string;
      message: string;
      quoteTimestamp: number;
      exclusiveRelayer: string;
      exclusivityDeadline: number;
      spokePoolAddress: string;
      destinationSpokePoolAddress: string;
      originChainId: number;
      destinationChainId: number;
      inputToken: string;
      outputToken: string;
    };
    limits: {
      minDeposit: string;
      maxDeposit: string;
      maxDepositInstant: string;
    };
    fees: {
      totalRelayFee: {
        pct: string;
        total: string;
      };
    };
  }
    
  export interface DepositParams {
    depositor: string;
    recipient: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    destinationChainId: number;
    exclusiveRelayer: string;
    quoteTimestamp: number;
    exclusivityPeriod: number;
    message: string;
  }