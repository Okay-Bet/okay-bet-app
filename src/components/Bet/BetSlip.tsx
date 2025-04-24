import React, { useState, useEffect } from "react";
import { useBetSlip } from "../../app/context/BetSlipContext";
import { useOrder } from "../../hooks/order/useOrder";
import { useQuote } from "../../hooks/quote/useQuote";
import { BetSlipQuoteSection } from "./BetSlipQuoteSection";
import { LimitlessBet, OrderRequest, ApprovalState, ApprovalStep } from "../types";

const MIN_TOKENS = 1.0;

export const BetSlip: React.FC = () => {
  const { bet, removeBet, clearBets } = useBetSlip();
  const { submitOrder, status, isLoading } = useOrder();
  const [amount, setAmount] = useState<string>("");
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [approvalStep, setApprovalStep] = useState<ApprovalStep>({
    status: "none"
  });
  
  const { quote, isQuoting } = useQuote(bet, amount);

  // Handle amount input changes
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (/^\d*\.?\d*$/.test(value) && !isNaN(parseFloat(value)))) {
      setAmount(value);
    }
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!bet) return;

    if (bet.provider === "POLYMARKET" || bet.provider === "KALSHI") {
      const url = bet.provider === "POLYMARKET" 
        ? `https://polymarket.com/event/${bet.slug}`
        : `https://kalshi.com/markets/${bet.ticker.split("-")[0]}`;
      window.open(url, "_blank");
      clearBets();
      return;
    }

    if (bet.provider === "LIMITLESS" && quote) {
      try {
        const orderRequest: OrderRequest = {
          marketSlug: bet.marketSlug,
          side: bet.position === "YES" ? 0 : 1,
          orderType: "GTC",
          price: bet.position === "YES" ? quote.averagePrice : 1 - quote.averagePrice,
          amount: parseFloat(amount),
        };
        await submitOrder(orderRequest);
      } catch (err) {
        console.error("Order placement error:", err);
        setTransactionStatus("Failed to place order. Please try again.");
      }
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      "text-white font-medium rounded-lg transition-all duration-300";

    if (bet?.provider === "POLYMARKET" || bet?.provider === "KALSHI") {
      return `${baseClasses} px-6 py-3 w-full bg-accent-red-500 hover:bg-accent-red-600 transform hover:scale-105 shadow-lg`;
    }

    if (status.state === "complete") {
      return `${baseClasses} px-6 py-3 bg-green-500 hover:bg-green-600 transform scale-105 shadow-lg`;
    }

    if (status.state === "error") {
      return `${baseClasses} px-6 py-3 bg-red-600 hover:bg-red-700`;
    }

    const disabledState =
      !amount || parseFloat(amount) < MIN_TOKENS || isLoading || !quote;

    return `${baseClasses} px-6 py-3 bg-accent-red-500 hover:bg-accent-red-600 
      ${disabledState ? "opacity-50 cursor-not-allowed" : ""}`;
  };

  const getButtonText = () => {
    if (bet?.provider === "POLYMARKET") {
      return "Go To Polymarket";
    }

    if (bet?.provider === "KALSHI") {
      return "Go To Kalshi";
    }

    if (!amount || parseFloat(amount) < MIN_TOKENS) return "Enter Amount";
    if (!quote) return "Loading Quote...";
    if (isLoading) {
      if (approvalStep.status === "approving") return "Approving USDC...";
      if (approvalStep.status === "pending") return "Confirming...";
      return "Processing...";
    }
    if (status.state === "complete") return "COMPLETE ✓";
    if (status.state === "error") return "Failed - Try Again";
    return "Place Order";
  };

  if (!bet) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-accent-red-500 shadow-xl z-50">
      <div className="container mx-auto max-w-4xl">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-bold text-black">Bet Slip</h3>
              <span className="text-accent-gray-500 text-sm">
                {isLoading &&
                  (approvalStep.status === "approving"
                    ? "Requesting approval..."
                    : approvalStep.status === "pending"
                    ? "Submitting order..."
                    : "")}
              </span>
            </div>
            <button
              onClick={clearBets}
              className="text-sm text-accent-red-500 hover:text-accent-red-600"
              disabled={isLoading}
            >
              Clear
            </button>
          </div>

          {/* Polymarket Warning Message */}
          {(bet.provider === "POLYMARKET" || bet.provider === "KALSHI") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
              <p className="text-blue-700 text-sm">
                {bet.provider === "POLYMARKET"
                  ? "Polymarket order execution is not yet available on Okay Bet. Clicking the button will redirect you to Polymarket.com to complete your order."
                  : "Kalshi order execution is not yet available on Okay Bet. Clicking the button will redirect you to Kalshi.com to complete your order."}
              </p>
            </div>
          )}

          {/* Bet Details */}
          <div className="bg-white border border-accent-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="font-medium text-black">{bet.eventTitle}</p>
                <p className="text-sm text-accent-gray-600">
                  {bet.marketQuestion}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-medium
                    ${
                      bet.position === "YES"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {bet.position}
                  </span>
                  <span className="font-medium text-black">
                    @ ${bet.price.toFixed(3)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeBet(bet.marketId)}
                className="text-accent-gray-400 hover:text-accent-gray-600"
                disabled={isLoading}
              >
                ×
              </button>
            </div>
          </div>

          {/* Quote Section */}
          {bet?.provider === "LIMITLESS" && (
            <div className="bg-white border border-accent-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                {/* Debug info */}
                <div className="text-xs text-gray-500">
                  Status:{" "}
                  {isQuoting ? "Quoting" : quote ? "Has Quote" : "No Quote"}
                </div>

                {isQuoting ? (
                  <div className="text-center py-2">
                    <span className="text-accent-gray-600">
                      Calculating quote...
                    </span>
                  </div>
                ) : quote ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-gray-600">
                        Position Size
                      </span>
                      <span className="font-medium text-black">
                        {quote.tokenAmount.toFixed(2)} tokens
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-gray-600">
                        Average Price
                      </span>
                      <span className="font-medium text-black">
                        ${quote.averagePrice.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-gray-600">Price Impact</span>
                      <span
                        className={`font-medium ${
                          quote.priceImpact > 0.05
                            ? "text-red-600"
                            : "text-black"
                        }`}
                      >
                        {(quote.priceImpact * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-gray-600">
                        Potential Payout
                      </span>
                      <span className="font-medium text-green-600">
                        ${quote.potentialPayout.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-gray-600">You Pay</span>
                      <span className="font-medium text-black">
                        ${quote.estimatedTotal.toFixed(2)} USDC
                      </span>
                    </div>
                    {quote.unfilled && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-yellow-700 text-sm">
                        Warning: ${quote.unfilled.toFixed(2)} USDC cannot be
                        filled at current prices
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-accent-gray-600">
                      Enter an amount to see quote
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input and Action Section */}
          <div
            className={`flex items-center gap-4 ${
              bet?.provider === "POLYMARKET" || bet?.provider === "KALSHI"
                ? "block"
                : ""
            }`}
          >
            {/* Only show amount input for Limitless */}
            {bet?.provider === "LIMITLESS" && (
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-accent-gray-300 rounded-lg pr-16 
                           text-black placeholder-accent-gray-400
                           focus:border-accent-red-500 focus:ring-1 focus:ring-accent-red-500"
                    disabled={isLoading || status.state === "complete"}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-gray-500">
                    USDC
                  </span>
                </div>
              </div>
            )}

            <button
              className={getButtonClasses()}
              disabled={
                bet?.provider === "LIMITLESS"
                  ? !amount ||
                    parseFloat(amount) < MIN_TOKENS ||
                    isLoading ||
                    !quote ||
                    status.state === "complete"
                  : false
              }
              onClick={handlePlaceOrder}
            >
              {getButtonText()}
            </button>
          </div>

          {/* Error Message */}
          {status.state === "error" && (
            <p className="text-sm text-red-600 mt-2">
              {status.error || "Transaction failed. Please try again."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
