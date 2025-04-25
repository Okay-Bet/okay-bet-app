// src/types/order.ts
import { OrderStatus } from "./orderbook";
import { ValidationResult } from "./validation";

export type OrderSide = "BUY" | "SELL";

export interface OrderRequest {
  marketSlug: string;
  side: number; 
  orderType: string; 
  price: number;
  amount: number;
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

// Hook return type for useOrder
export interface OrderHook {
  submitOrder: (order: OrderRequest) => Promise<void>;
  status: OrderStatus;
  isLoading: boolean;
  bridgeStep?: BridgeProgress;
}

export interface BridgeStep {
  step: "approval" | "bridging";
  status: "approving" | "pending" | "success" | "failed";
  txHash?: string;
  error?: string;
}

export interface UseLimitlessOrderReturn {
  submitOrder: (orderRequest: OrderRequest) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  bridgeStep: BridgeStep;
}

export interface UnsignedOrder {
  salt: number;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: number;
  nonce: number;
  price: number;
  feeRateBps: number;
  side: number;
}

export interface UnsignedOrderResponse {
  status: string;
  unsignedOrder: {
    order: UnsignedOrder;
    orderType: string;
    marketSlug: string;
  };
}