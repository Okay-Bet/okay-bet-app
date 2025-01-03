// src/types/order.ts
export type { ValidationResponse } from './validation';
export type OrderSide = "BUY" | "SELL";

export interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: OrderSide;
  isYesToken: boolean;
}

export interface OrderPayload {
  user_address: string;
  token_id: string;
  price: number;
  amount: string;           
  side: OrderSide;
  is_yes_token: boolean;
  usdc_transaction_hash?: string;
}

export type OrderStatus =
  | { state: "idle" }
  | { state: "validating" }
  | { state: "validated"; data: ValidationResponse }
  | { state: "preparing_transfer" }
  | { state: "awaiting_signature" }
  | { state: "confirming_transfer"; txHash: string }
  | { state: "submitting_order" }
  | { state: "complete"; result: any }
  | { state: "error"; error: string };

