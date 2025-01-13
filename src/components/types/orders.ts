// src/types/order.ts
import { ValidationResponse } from "./validation";

export type OrderSide = "BUY" | "SELL";

export interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: OrderSide;
  isYesToken: boolean;
  estimatedTokens?: number;
  priceImpact?: number;
}

export interface OrderPayload {
  user_address: string;
  token_id: string;
  price: number;
  amount: string;
  side: OrderSide;
  is_yes_token: boolean;
  usdc_transaction_hash?: string;
  origin_chain_id?: number;
  destination_chain_id?: number;
}

// Bridge-specific types for better type safety
export interface BridgeDetails {
  fromChain: number;
  toChain: number;
  estimatedTime: number;
}

export interface BridgeProgress {
  step: "bridging" | "confirming";
  progress: number;
  estimatedTimeRemaining?: number;
}

// Combined order status that works with both bridging and regular order flow
export type OrderStatus =
  | { state: "idle" }
  | { state: "validating" }
  | { state: "validated"; data: ValidationResponse }
  | {
      state: "preparing_transfer";
      bridgeDetails?: BridgeDetails;
    }
  | { state: "awaiting_signature" }
  | {
      state: "confirming_transfer";
      txHash: string;
      bridgeStatus?: BridgeProgress;
    }
  | { state: "submitting_order" }
  | { state: "complete"; result: any }
  | { state: "error"; error: string; bridgeError?: boolean };

// Hook return type for useOrder
export interface OrderHook {
  submitOrder: (order: OrderRequest) => Promise<void>;
  status: OrderStatus;
  isLoading: boolean;
  bridgeStep?: BridgeProgress;
}
