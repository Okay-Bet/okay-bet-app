import React, { useState } from "react";
import { useBetSlip } from "@/app/context/BetSlipContext";
import { useOrder } from "@/hooks/useOrder";

export const BetSlip: React.FC = () => {
  const { bet, removeBet, clearBets } = useBetSlip();
  const { submitOrder, loading, error } = useOrder();
  const [amount, setAmount] = useState<string>("");
  const [orderError, setOrderError] = useState<string | null>(null);

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
      setOrderError(null);
      if (!bet || !amount) return;

      // Map betting position to yes/no
      const side = bet.position.toLowerCase() === 'yes' ? 'yes' : 'no';

      const orderRequest = {
        market_id: bet.marketId,
        price: bet.price,
        amount: parseFloat(amount),
        side: side as 'yes' | 'no',
      };

      console.log("Submitting order:", orderRequest); // Debug log

      const result = await submitOrder(orderRequest);
      if (result.success) {
        clearBets();
        setAmount("");
      }
    } catch (err) {
      console.error("Order placement error:", err); // Debug log
      setOrderError(err instanceof Error ? err.message : "Failed to place order");
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

        {(orderError || error) && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {orderError || error}
          </div>
        )}

        <div className="space-y-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium">{bet.eventTitle}</p>
                <p className="text-xs text-gray-600">{bet.marketQuestion}</p>
                <p className="text-sm font-medium mt-1">
                  {bet.position} @ ${bet.price.toFixed(2)}
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
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                USDC
              </span>
            </div>
          </div>
          <button
            className="px-6 py-2 p-4 bg-tertiary text-font font-heading rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || parseFloat(amount) <= 0 || loading}
            onClick={handlePlaceOrder}
          >
            {loading ? "Submitting..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};
