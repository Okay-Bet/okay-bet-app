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

  let url;
  switch (bet.provider) {
    case "POLYMARKET":
      url = `https://polymarket.com/event/${bet.slug}`;
      break;
    case "KALSHI":
      url = `https://kalshi.com/markets/${bet.ticker.split("-")[0]}`;
      break;
    case "LIMITLESS":
      url = `https://limitless.exchange/markets/${bet.marketSlug}`;
      break;
  }

  window.open(url, "_blank");
  clearBets();
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
    switch (bet?.provider) {
      case "POLYMARKET":
        return "Go To Polymarket";
      case "KALSHI":
        return "Go To Kalshi";
      case "LIMITLESS":
        return "Go To Limitless";
      default:
        return "";
    }
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
            </div>
            <button
              onClick={clearBets}
              className="text-sm text-accent-red-500 hover:text-accent-red-600"
            >
              Clear
            </button>
          </div>

          {/* Platform Redirect Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
            <p className="text-blue-700 text-sm">
              {bet.provider === "POLYMARKET"
                ? "Polymarket order execution is not yet available on Okay Bet. Clicking the button will redirect you to Polymarket.com to complete your order."
                : bet.provider === "KALSHI"
                ? "Kalshi order execution is not yet available on Okay Bet. Clicking the button will redirect you to Kalshi.com to complete your order."
                : "Limitless order execution is temporarily disabled. Clicking the button will redirect you to Limitless to complete your order."}
            </p>
          </div>

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
              >
                ×
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="block">
            <button
              className="text-white font-medium rounded-lg transition-all duration-300 px-6 py-3 w-full bg-accent-red-500 hover:bg-accent-red-600 transform hover:scale-105 shadow-lg"
              onClick={handlePlaceOrder}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};