import React, { useState, useEffect } from "react";
import { useBetSlip } from "../../app/context/BetSlipContext";
import { useOrder } from "../../hooks/order/useOrder";
import { Bet, LimitlessBet, PolymarketBet,   
  OrderBookData, 
  OrderQuote, 
  LimitlessOrder,
  OrderRequest,
  MarketInfo } from "../../components/types";

// Constants
const MIN_TOKENS = 1.0;
const API_URL = process.env.NEXT_PUBLIC_LIMITLESS_API_URL || 'https://api.limitless.exchange';


export const BetSlip: React.FC = () => {
  // Hook integrations
  const { bet, removeBet, clearBets } = useBetSlip();
  const { submitOrder, status, approvalStep, isLoading } = useOrder();
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);

  // Local state management
  const [amount, setAmount] = useState<string>("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>("");

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


  // Event handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const calculateQuoteFromOrderBook = (
    amount: number,
    position: "YES" | "NO",
    orderBook: OrderBookData
  ): OrderQuote | null => {
    try {
      const orders = position === "YES" ? orderBook.asks : orderBook.bids;
      let remainingAmount = amount * 1_000_000; // Convert to base units (USDC 6 decimals)
      let totalCost = 0;
      let filledAmount = 0;

      for (const level of orders) {
        const levelSize = Math.min(remainingAmount, level.size);
        totalCost += levelSize * level.price;
        filledAmount += levelSize;
        remainingAmount -= levelSize;

        if (remainingAmount <= 0) break;
      }

      if (remainingAmount > 0) {
        // Order cannot be fully filled
        return {
          estimatedTotal: totalCost / 1_000_000, // Convert back to USDC
          averagePrice: totalCost / filledAmount,
          priceImpact: Math.abs((orderBook.lastTradePrice - (totalCost / filledAmount)) / orderBook.lastTradePrice),
          unfilled: remainingAmount / 1_000_000,
        };
      }

      return {
        estimatedTotal: totalCost / 1_000_000,
        averagePrice: totalCost / filledAmount,
        priceImpact: Math.abs((orderBook.lastTradePrice - (totalCost / filledAmount)) / orderBook.lastTradePrice),
      };
    } catch (error) {
      console.error("Error calculating quote:", error);
      return null;
    }
  };

  useEffect(() => {
    const getQuote = async () => {
      if (
        !bet ||
        !amount ||
        isNaN(parseFloat(amount)) ||
        bet.provider !== "LIMITLESS"
      ) {
        setQuote(null);
        return;
      }

      const limitlessBet = bet as LimitlessBet;
      setIsQuoting(true);

      try {
        // Fetch orderbook data
        const response = await fetch(
          `${API_URL}/markets/${limitlessBet.marketSlug}/historical-price`
        );
        const orderBook = await response.json();

        if (!orderBook.bids || !orderBook.asks) {
          throw new Error('Invalid orderbook data received');
        }
        
        setOrderBookData(orderBook);

        // Calculate quote from orderbook
        const quoteResult = calculateQuoteFromOrderBook(
          parseFloat(amount),
          limitlessBet.position,
          orderBook
        );

        if (quoteResult) {
          setQuote({
            tokenAmount: parseFloat(amount) / quoteResult.averagePrice,
            priceImpact: quoteResult.priceImpact,
            estimatedTotal: quoteResult.estimatedTotal,
          });

          // Show warning if there's unfilled amount
          if (quoteResult.unfilled) {
            console.warn(`Warning: ${quoteResult.unfilled} USDC cannot be filled at current prices`);
          }
        }
      } catch (error) {
        console.error("Error getting quote:", error);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    };

    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, bet]);

  const handlePlaceOrder = async () => {
    if (!bet) return;

    if (bet.provider === "POLYMARKET") {
      const polymarketUrl = `https://polymarket.com/event/${bet.slug}`;
      window.open(polymarketUrl, "_blank");
      clearBets();
      return;
    }

    if (bet.provider === "KALSHI") {
      // Split the ticker at the first dash and take the first part
      const baseTickerPart = bet.ticker.split('-')[0];
      const kalshiUrl = `https://kalshi.com/markets/${baseTickerPart}`;
      window.open(kalshiUrl, "_blank");
      clearBets();
      return;
    }

    // At this point, we know it's a Limitless bet
    const limitlessBet = bet as LimitlessBet;

    if (!quote) {
      console.error("Missing quote data");
      return;
    }

    if (bet.provider === "LIMITLESS" && quote) {
      try {
        const orderRequest: OrderRequest = {
          marketSlug: bet.marketSlug,
          amount: parseFloat(amount),
          price: bet.position === "YES" ? quote.averagePrice : 1 - quote.averagePrice,
          side: "BUY",
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
      if (status.state === "submitting_order") return "Placing Order...";
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
          {bet?.provider === "LIMITLESS" && quote && !isQuoting && (
            <div className="bg-white border border-accent-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-accent-gray-600 flex items-center gap-1">
                    Potential Payout
                  </span>
                  <span className="font-medium text-black">
                  {(quote.estimatedTotal / quote.averagePrice).toFixed(2)} USDC
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
