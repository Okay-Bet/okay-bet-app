// src/types/orderbook.ts
export interface OrderBookEntry {
  price: number;
  size: number;
  side: "BUY" | "SELL";
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  tokenId: string;
  lastTradePrice: number;
  adjustedMidpoint: number;
  maxSpread: string;
  minSize: string;
}

interface MarketInfo {
  best_bid_price: number;
  best_bid_size: number;
  best_ask_price: number;
  best_ask_size: number;
  max_spread: number;
  adjusted_midpoint: number;
  last_checked: string;
}

export interface OrderBookResponse {
  orderbook: OrderBookData;
  market_info: MarketInfo;
}

export interface OrderQuote {
  tokenAmount: number;
  estimatedTotal: number;
  priceImpact: number;
  averagePrice: number;
  potentialPayout: number;
  unfilled?: number;
}

// Order creation types
export interface LimitlessOrder {
  salt: number;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: number;
  price: number;
  feeRateBps: number;
  side: number; // 0 for buy, 1 for sell
  signature: string;
  signatureType: number;
}

export interface OrderResponse {
  order: LimitlessOrder;
  makerMatches: any[]; // Define specific type if needed
}

// Update existing bet types
export interface LimitlessBet {
  marketId: string;
  marketSlug: string; // Add this field
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
  provider: "LIMITLESS";
  tokenId: string;
}

export interface OrderStatus {
  state: "idle" | "preparing" | "signing" | "submitting" | "complete" | "error";
  error?: string;
}


// API response types
export interface MarketPriceResponse {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  tokenId: string;
  lastTradePrice: number;
  adjustedMidpoint: number;
  maxSpread: string;
  minSize: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order?: OrderResponse;
  error?: string;
}

// Error types
export interface LimitlessApiError {
  code: string;
  message: string;
  details?: any;
}

// Constants
export const ORDER_TYPES = {
  GTC: "GTC", // Good Till Cancelled
  FOK: "FOK", // Fill Or Kill
  GTD: "GTD", // Good Till Date
} as const;

export type OrderType = keyof typeof ORDER_TYPES;

// Utility type for API parameters
export interface CreateOrderParams {
  order: LimitlessOrder;
  ownerId: number;
  orderType: OrderType;
  marketSlug: string;
}

// WebSocket types for real-time orderbook updates
export interface OrderBookUpdate {
  type: "orderbook_update";
  marketSlug: string;
  data: {
    bids?: OrderBookEntry[];
    asks?: OrderBookEntry[];
    lastTradePrice?: number;
  };
}

export interface TradeUpdate {
  type: "trade";
  marketSlug: string;
  data: {
    price: number;
    size: number;
    side: "BUY" | "SELL";
    timestamp: number;
  };
}

export type WebSocketMessage = OrderBookUpdate | TradeUpdate;

// Configuration types
export interface LimitlessConfig {
  apiUrl: string;
  wsUrl: string;
  minOrderSize: number;
  maxPriceImpact: number;
  defaultExpirationHours: number;
}


// Order cancellation types
export interface CancelOrderRequest {
  orderId: string;
  marketSlug: string;
  reason?: string;
}

export interface BatchCancelRequest {
  orderIds: string[];
  marketSlug: string;
}

export interface CancelResponse {
  success: boolean;
  cancelledOrders: string[];
  errors?: Record<string, string>;
}
