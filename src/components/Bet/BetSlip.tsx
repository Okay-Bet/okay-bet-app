import React, { useState, useEffect } from "react";
import { useBetSlip } from "../../app/context/BetSlipContext";
import { useOrder } from "../../hooks/order/useOrder";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

// Define types for order requests and validation
interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: "BUY" | "SELL";
  isYesToken: boolean;
  estimatedTokens?: number;
  priceImpact?: number;
}

interface OrderQuote {
  tokenAmount: number;
  priceImpact: number;
  estimatedTotal: number;
}

// FPMM contract interface
const FPMM_ABI = parseAbi([
  "function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)",
  "function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256)",
]);

// Initialize the public client for blockchain interactions
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Constants
const MIN_TOKENS = 1.0;

export const BetSlip: React.FC = () => {
  // Hook integrations
  const { bet, removeBet, clearBets } = useBetSlip();
  const { submitOrder, status, approvalStep, isLoading } = useOrder();

  // Local state management
  const [amount, setAmount] = useState<string>("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>("");

  // Effect to handle transaction status messages
  useEffect(() => {
    if (approvalStep.status === "processing") {
      setTransactionStatus("Requesting USDC approval...");
    } else if (approvalStep.status === "pending") {
      setTransactionStatus("Waiting for approval confirmation...");
    } else if (status.state === "submitting_order") {
      setTransactionStatus("Placing your order...");
    } else if (status.state === "complete") {
      setTransactionStatus("Order completed successfully!");
      // Only clear bets after showing success message
      const timeoutId = setTimeout(() => {
        clearBets();
        setAmount("");
        setQuote(null);
        setTransactionStatus("");
      }, 3000); // Clear after 3 seconds
      return () => clearTimeout(timeoutId);
    } else if (status.state === "error") {
      setTransactionStatus(`Error: ${status.error || "Transaction failed"}`);
    }
  }, [approvalStep, status, clearBets]);

  // Effect for quote calculation
  useEffect(() => {
    const getQuote = async () => {
      if (!bet || !amount || isNaN(parseFloat(amount))) {
        setQuote(null);
        return;
      }

      setIsQuoting(true);
      try {
        // Convert USDC amount to proper decimals (6 decimals for USDC)
        const investmentAmount = BigInt(
          Math.floor(parseFloat(amount) * 1_000_000)
        );
        const outcomeIndex = bet.position === "YES" ? 0n : 1n;

        // Calculate token amount for the investment
        const tokenAmount = await publicClient.readContract({
          address: bet.tokenId as `0x${string}`,
          abi: FPMM_ABI,
          functionName: "calcBuyAmount",
          args: [investmentAmount, outcomeIndex],
        });

        // Get base amount for price impact calculation
        const baseAmount = BigInt(1_000_000); // 1 USDC
        const baseTokens = await publicClient.readContract({
          address: bet.tokenId as `0x${string}`,
          abi: FPMM_ABI,
          functionName: "calcBuyAmount",
          args: [baseAmount, outcomeIndex],
        });

        // Calculate price impact
        const expectedTokens = Number(baseTokens) * parseFloat(amount);
        const actualTokens = Number(tokenAmount);
        const priceImpact = Math.abs(
          (actualTokens - expectedTokens) / expectedTokens
        );

        setQuote({
          tokenAmount: Number(tokenAmount) / 1_000_000,
          priceImpact,
          estimatedTotal: parseFloat(amount),
        });
      } catch (error) {
        console.error("Error getting quote:", error);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    };

    // Debounce quote requests to prevent spam
    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, bet]);

  // Event handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePlaceOrder = async () => {
    if (!bet || !amount || !quote) {
      console.error("Missing required data:", { bet, amount, quote });
      return;
    }

    try {
      const amountInUSDC = parseFloat(amount) * 1_000_000;
      const orderRequest: OrderRequest = {
        tokenId: bet.tokenId,
        price: bet.price,
        amount: amountInUSDC,
        side: "BUY",
        isYesToken: bet.position === "YES",
        estimatedTokens: quote.tokenAmount,
        priceImpact: quote.priceImpact,
      };

      console.log("Submitting order request:", orderRequest);
      await submitOrder(orderRequest);
    } catch (err) {
      console.error("Order placement error:", err);
      setTransactionStatus("Failed to place order. Please try again.");
    }
  };

  // Quote display component
  const renderQuote = () => {
    if (!quote) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Tokens to receive</span>
            <span className="font-medium text-gray-900">
              {quote.tokenAmount.toFixed(6)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Price Impact</span>
            <span
              className={`font-medium ${
                quote.priceImpact > 0.05 ? "text-yellow-600" : "text-gray-900"
              }`}
            >
              {(quote.priceImpact * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Total Cost</span>
            <span className="font-medium text-gray-900">
              {quote.estimatedTotal.toFixed(2)} USDC
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Early return if no active bet
  if (!bet) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto max-w-4xl">
        <div className="max-h-[400px] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bet Slip</h3>
              <button
                onClick={clearBets}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
                disabled={isLoading}
              >
                Clear
              </button>
            </div>

            {/* Transaction Status Message */}
            {transactionStatus && (
              <div
                className={`p-4 rounded-lg ${
                  status.state === "error"
                    ? "bg-red-50 text-red-700"
                    : status.state === "complete"
                    ? "bg-green-50 text-green-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                <p className="text-sm font-medium">{transactionStatus}</p>
              </div>
            )}

            {/* Bet Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {bet.eventTitle}
                  </p>
                  <p className="text-xs text-gray-600">{bet.marketQuestion}</p>
                  <p className="text-sm font-medium text-gray-900 mt-2">
                    {bet.position} @ ${bet.price.toFixed(3)}
                  </p>
                </div>
                <button
                  onClick={() => removeBet(bet.marketId)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Quote Section */}
            {isQuoting ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Getting price quote...</p>
              </div>
            ) : (
              renderQuote()
            )}

            {/* Input and Action Section */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-16 font-medium text-gray-900 placeholder-gray-400"
                    disabled={isLoading}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    USDC
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Minimum bet size: {MIN_TOKENS.toFixed(2)} USDC
                </p>
              </div>
              <button
                className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg transition-colors
                  ${
                    !amount ||
                    parseFloat(amount) < MIN_TOKENS ||
                    isLoading ||
                    !quote
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-700"
                  }`}
                disabled={
                  !amount ||
                  parseFloat(amount) < MIN_TOKENS ||
                  isLoading ||
                  !quote
                }
                onClick={handlePlaceOrder}
              >
                {isLoading
                  ? transactionStatus || "Processing..."
                  : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
