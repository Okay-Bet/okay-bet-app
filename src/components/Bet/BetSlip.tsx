import React, { useState } from "react";
import { useBetSlip } from "@/app/context/BetSlipContext";
import { useOrder } from "@/hooks/useOrder";

export const BetSlip: React.FC = () => {
  const { bet, removeBet, clearBets } = useBetSlip();
  const { submitOrder, status, isLoading } = useOrder();
  const [amount, setAmount] = useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const calculatePotentialWin = (price: number, amount: number) => {
    return (amount / price).toFixed(2);
  };

  const handlePlaceOrder = async () => {
    try {
      if (!bet || !amount) return;

      const orderRequest = {
        tokenId: bet.tokenId,
        price: bet.price,
        amount: parseFloat(amount),
        side: bet.position === "YES" ? "BUY" : "SELL",
        isYesToken: bet.position === "YES",
      };

      await submitOrder(orderRequest);
    } catch (err) {
      console.error("Order placement error:", err);
    }
  };

  const renderValidationDetails = () => {
    if (status.state === "validated") {
      const { current_bid, current_ask, price_impact } =
        status.data.market_info;
      return (
        <div className="text-xs text-gray-600 mt-2">
          <p>Current Bid: ${current_bid.toFixed(3)}</p>
          <p>Current Ask: ${current_ask.toFixed(3)}</p>
          {price_impact && (
            <p>Price Impact: {(price_impact * 100).toFixed(2)}%</p>
          )}
        </div>
      );
    }
    return null;
  };

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
        return (
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-green-600">
              Order validated successfully
            </p>
            {renderValidationDetails()}
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
          </div>
          <button
            className="px-6 py-2 bg-tertiary text-font font-heading rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            onClick={handlePlaceOrder}
          >
            {isLoading ? "Processing..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};
