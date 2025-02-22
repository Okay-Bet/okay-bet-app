import React, { useState, useEffect } from "react";
import { useBetSlip } from "../../app/context/BetSlipContext";
import { useOrder } from "../../hooks/order/useOrder";
import { createPublicClient, http, parseAbi } from "viem";
import { Bet, LimitlessBet, PolymarketBet } from "../../components/types";
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

const isLimitlessBet = (bet: Bet): bet is LimitlessBet => {
  return bet.provider === "LIMITLESS";
};

// Initialize the public client for blockchain interactions
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Constants
const MIN_TOKENS = 1.0;

export const BetSlip: React.FC = () => {
  // Hook integrations
  const {
    bets,
    removeBet,
    clearBets,
    isParlay,
    parleyOdds,
    getEstimatedPayout,
  } = useBetSlip();
  const { submitOrder, status, approvalStep, isLoading } = useOrder();

  // Local state management
  const [amount, setAmount] = useState<string>("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>("");

  // Calculate parlay information
  const estimatedPayout = getEstimatedPayout(amount);

  // Effect to handle transaction status messages
  useEffect(() => {
    if (status.state === "complete") {
      setTransactionStatus("Order completed successfully!");
      // Wait for completion animation and then refresh
      const timeoutId = setTimeout(() => {
        clearBets();
        setAmount("");
        setQuote(null);
        setTransactionStatus("");
        // Refresh the entire page
        window.location.reload();
      }, 3000); // Matches the animation duration
      return () => clearTimeout(timeoutId);
    } else if (approvalStep.status === "approving") {
      setTransactionStatus("Requesting USDC approval...");
    } else if (approvalStep.status === "pending") {
      setTransactionStatus("Waiting for approval confirmation...");
    } else if (status.state === "submitting_order") {
      setTransactionStatus("Placing your order...");
    } else if (status.state === "error") {
      setTransactionStatus(`Error: ${status.error || "Transaction failed"}`);
    }
  }, [approvalStep, status, clearBets]);

  // Effect for quote calculation
  useEffect(() => {
    const getQuote = async () => {
      // Only get quote for single Limitless bets
      if (
        bets.length !== 1 ||
        !amount ||
        isNaN(parseFloat(amount)) ||
        bets[0].provider !== "LIMITLESS"
      ) {
        setQuote(null);
        return;
      }

      const limitlessBet = bets[0] as LimitlessBet;

      setIsQuoting(true);
      try {
        const investmentAmount = BigInt(
          Math.floor(parseFloat(amount) * 1_000_000)
        );
        const outcomeIndex = limitlessBet.position === "YES" ? 0n : 1n;

        const tokenAmount = await publicClient.readContract({
          address: limitlessBet.tokenId as `0x${string}`,
          abi: FPMM_ABI,
          functionName: "calcBuyAmount",
          args: [investmentAmount, outcomeIndex],
        });

        const baseAmount = BigInt(1_000_000); // 1 USDC
        const baseTokens = await publicClient.readContract({
          address: limitlessBet.tokenId as `0x${string}`,
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

    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, bets]);

  // Event handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePlaceOrder = async () => {
    if (bets.length === 0) return;

    // Handle Polymarket redirects
    if (bets.some((bet) => bet.provider === "POLYMARKET")) {
      const polymarketBet = bets.find((bet) => bet.provider === "POLYMARKET");
      if (polymarketBet) {
        const polymarketUrl = `https://polymarket.com/event/${polymarketBet.slug}`;
        window.open(polymarketUrl, "_blank");
        clearBets();
        return;
      }
    }

    // Handle single Limitless bet
    if (bets.length === 1 && bets[0].provider === "LIMITLESS") {
      const limitlessBet = bets[0] as LimitlessBet;
      try {
        const amountInUSDC = parseFloat(amount) * 1_000_000;
        const orderRequest: OrderRequest = {
          tokenId: limitlessBet.tokenId,
          price: limitlessBet.price,
          amount: amountInUSDC,
          side: "BUY",
          isYesToken: limitlessBet.position === "YES",
          estimatedTokens: quote?.tokenAmount,
          priceImpact: quote?.priceImpact,
        };

        await submitOrder(orderRequest);
      } catch (err) {
        console.error("Order placement error:", err);
        setTransactionStatus("Failed to place order. Please try again.");
      }
    }

    // TODO: Handle parlay order submission
  };

  const getButtonClasses = () => {
    const baseClasses =
      "text-white font-medium rounded-lg transition-all duration-300";

    if (bets?.provider === "POLYMARKET") {
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
    if (bets?.provider === "POLYMARKET") {
      return "Go To Polymarket";
    }

    if (!amount || parseFloat(amount) < MIN_TOKENS) return "Enter Amount";
    if (!quote) return "Loading Quote...";
    if (isLoading) {
      if (approvalStep.status === "approving") return "Approving USDC...";
      if (approvalStep.status === "pending") return "Confirming...";
      if (status.state === "submitting_order") return "Placing Order...";
      return "Processing...";
    }
    if (status.state === "complete") return "COMPLETE ✓";
    if (status.state === "error") return "Failed - Try Again";
    return "Place Order";
  };

  if (bets.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-accent-red-500 shadow-xl z-50">
      <div className="container mx-auto max-w-4xl">
        <div className="p-4 space-y-4">
          {/* Header Section */}
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-bold text-black">
                {isParlay ? "Parlay Slip" : "Bet Slip"}
              </h3>
              {isParlay && (
                <span className="text-sm text-accent-gray-500">
                  {bets.length} selections
                </span>
              )}
              <span className="text-accent-gray-500 text-sm">
                {isLoading &&
                  (approvalStep.status === "approving"
                    ? "Requesting approval..."
                    : approvalStep.status === "pending"
                    ? "Confirming approval..."
                    : status.state === "submitting_order"
                    ? "Submitting order..."
                    : "")}
              </span>
            </div>
            <button
              onClick={clearBets}
              className="text-sm text-accent-red-500 hover:text-accent-red-600"
              disabled={isLoading}
            >
              Clear All
            </button>
          </div>

          {/* Mixed Provider Warning */}
          {bets.some((bet) => bet.provider === "POLYMARKET") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 text-sm">
                Polymarket bets cannot be placed directly through Okay Bet. You
                will be redirected to Polymarket.com to complete these
                selections.
              </p>
            </div>
          )}

          {/* Bets List */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {bets.map((bet) => (
              <div
                key={bet.marketId}
                className="bg-white border border-accent-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-accent-gray-100 text-accent-gray-600">
                        {bet.provider}
                      </span>
                    </div>
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
            ))}
          </div>

          {/* Parlay Information */}
          {isParlay && (
            <div className="bg-white border border-accent-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-accent-gray-600">Combined Odds</span>
                  <span className="font-medium text-black">
                    {parleyOdds.toFixed(3)}x
                  </span>
                </div>
                {amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-accent-gray-600">
                      Potential Payout
                    </span>
                    <span className="font-medium text-black">
                      {estimatedPayout.toFixed(2)} USDC
                    </span>
                  </div>
                )}
                <div className="text-xs text-accent-gray-500 mt-2">
                  Parlay odds include a 20% discount from true odds
                </div>
              </div>
            </div>
          )}

          {/* Single Bet Quote Section */}
          {!isParlay &&
            bets[0]?.provider === "LIMITLESS" &&
            quote &&
            !isQuoting && (
              <div className="bg-white border border-accent-gray-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-accent-gray-600">
                      Potential Payout
                    </span>
                    <span className="font-medium text-black">
                      {quote.tokenAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-gray-600">Price Impact</span>
                    <span
                      className={`font-medium ${
                        quote.priceImpact > 0.05 ? "text-red-600" : "text-black"
                      }`}
                    >
                      {(quote.priceImpact * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-gray-600">You Pay</span>
                    <span className="font-medium text-black">
                      {quote.estimatedTotal.toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Input and Action Section */}
          <div className="flex items-center gap-4">
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

            <button
              className={getButtonClasses()}
              disabled={
                !amount ||
                parseFloat(amount) < MIN_TOKENS ||
                isLoading ||
                (!isParlay && !quote && bets[0]?.provider === "LIMITLESS") ||
                status.state === "complete"
              }
              onClick={handlePlaceOrder}
            >
              {getButtonText()}
            </button>
          </div>

          {/* Status Messages */}
          {status.state === "error" && (
            <p className="text-sm text-red-600 mt-2">
              {status.error || "Transaction failed. Please try again."}
            </p>
          )}
          {transactionStatus && (
            <p className="text-sm text-center mt-2">{transactionStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
};
