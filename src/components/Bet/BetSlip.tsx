import React, { useState } from "react";
import { useBetSlip } from "@/app/context/BetSlipContext";
import { useOrder } from "@/hooks/useOrder";

// Order types
type OrderSide = "BUY" | "SELL";
type Position = "YES" | "NO";

interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: OrderSide;
  isYesToken: boolean;
}

interface ValidationResponse {
  valid: boolean;
  estimated_total: number;
  price_impact: number;
  execution_possible: boolean;
  warning: string | null;
  min_order_size: number;
  max_order_size: number;
}

// Market info types
interface MarketInfo {
  current_bid: string;
  current_ask: string;
}

// Status types
type ValidationState =
  | "validating"
  | "validated"
  | "validation_failed"
  | "error";

interface ValidationStatus {
  state: ValidationState;
  data?: ValidationResponse;
  error?: string;
}

// Bet types
interface Bet {
  tokenId: string;
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: Position;
  price: number;
}

// Hook return types
interface BetSlipHook {
  bet: Bet | null;
  removeBet: (marketId: string) => void;
  clearBets: () => void;
}

interface OrderHook {
  submitOrder: (order: OrderRequest) => Promise<void>;
  status: ValidationStatus;
  isLoading: boolean;
}

export const BetSlip: React.FC = () => {
  const { bet, removeBet, clearBets } = useBetSlip() as BetSlipHook;
  const { submitOrder, status, isLoading } = useOrder() as OrderHook;
  const [amount, setAmount] = useState<string>("");

  const MIN_TOKENS = 5.0;

  const getMinimumUSDC = (price: number): number => {
    return MIN_TOKENS * price;
  };

  const currentMinimumUSDC = bet ? getMinimumUSDC(bet.price) : 0;

  const calculatePotentialWin = (price: number, amount: number) => {
    return (amount / price).toFixed(2);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      if (!bet || !amount) return;

      const usdcAmount = parseFloat(amount);

      // Check minimum amount before submitting
      if (usdcAmount < currentMinimumUSDC) {
        status.error = `Minimum order size is ${currentMinimumUSDC.toFixed(
          2
        )} USDC`;
        return;
      }

      const orderRequest: OrderRequest = {
        tokenId: bet.tokenId,
        price: bet.price,
        amount: usdcAmount,
        side: bet.position === "YES" ? "BUY" : "SELL",
        isYesToken: bet.position === "YES",
      };

      // Submit the order
      await submitOrder(orderRequest);

      // Clear bet slip after successful order
      clearBets();
      setAmount("");
    } catch (err) {
      console.error("Order placement error:", err);
    }
  };

  // const renderValidationDetails = () => {
  //   if (status.state === "validated" && status.data?.market_info) {
  //     const { current_bid, current_ask } = status.data.market_info;
  //     return (
  //       <div className="text-xs text-gray-600 mt-2">
  //         <p>Current Bid: ${parseFloat(current_bid).toFixed(3)}</p>
  //         <p>Current Ask: ${parseFloat(current_ask).toFixed(3)}</p>
  //       </div>
  //     );
  //   }
  //   return null;
  // };

  const renderStatus = () => {
    switch (status.state) {
      case "validating":
        return (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-600">Validating order...</p>
            <p className="text-xs text-blue-500">Checking market conditions</p>
          </div>
        );

      case "validated":
        if (!status.data) return null;

        const priceImpactPercent = (status.data.price_impact * 100).toFixed(2);
        const estimatedTotal = (
          status.data.estimated_total / 1_000_000
        ).toFixed(2);

        return (
          <div
            className={`p-3 rounded-lg mb-4 ${
              status.data.warning ? "bg-yellow-50" : "bg-green-50"
            }`}
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-800">
                Order Details:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600">Estimated Total:</p>
                <p className="text-gray-800">{estimatedTotal} USDC</p>

                <p className="text-gray-600">Price Impact:</p>
                <p
                  className={`${
                    parseFloat(priceImpactPercent) > 5
                      ? "text-yellow-600"
                      : "text-gray-800"
                  }`}
                >
                  {priceImpactPercent}%
                </p>

                <p className="text-gray-600">Execution:</p>
                <p
                  className={`${
                    status.data.execution_possible
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {status.data.execution_possible
                    ? "Available"
                    : "Limited Liquidity"}
                </p>
              </div>

              {status.data.warning && (
                <div className="mt-2 text-sm text-yellow-600 bg-yellow-100 p-2 rounded">
                  ⚠️ {status.data.warning}
                </div>
              )}
            </div>
          </div>
        );

      case "validation_failed":
        return (
          <div className="bg-red-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-red-600">Validation failed</p>
            <p className="text-xs text-red-500">{status.error}</p>
          </div>
        );

      case "error":
        return (
          <div className="bg-red-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-red-600">{status.error}</p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!bet) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Bet Slip</h3>
          <button
            onClick={clearBets}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear
          </button>
        </div>

        {renderStatus()}

        <div className="space-y-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium">{bet.eventTitle}</p>
                <p className="text-xs text-gray-600">{bet.marketQuestion}</p>
                <p className="text-sm font-medium mt-1">
                  {bet.position} @ ${bet.price.toFixed(3)}
                </p>
              </div>
              <button
                onClick={() => removeBet(bet.marketId)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            {amount && (
              <p className="text-sm text-gray-600">
                Wagering {amount} USDC to win{" "}
                {calculatePotentialWin(bet.price, parseFloat(amount))} USDC
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg pr-12"
                disabled={isLoading}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                USDC
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Minimum bet size: {currentMinimumUSDC.toFixed(2)} USDC
            </p>
          </div>
          <button
            className="px-6 py-2 bg-tertiary text-font font-heading rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !amount || parseFloat(amount) < currentMinimumUSDC || isLoading
            }
            onClick={handlePlaceOrder}
          >
            {isLoading ? "Processing..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};
