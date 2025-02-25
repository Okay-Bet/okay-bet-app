"use client";
import React from "react";
import { useInvestment } from "@/hooks/useInvestment";

export default function InvestComponent() {
  const {
    address,
    amount,
    setAmount,
    loading,
    handleDeposit,
    isExpanded,
    setIsExpanded,
    parlayTokenBalance,
    parlayTokenError,
    parlayTokenLoading,
    usdcBalance,
    balanceLoading,
    balanceError,
    errorMessage,
  } = useInvestment();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const formatNumber = (value: string) => {
    return parseFloat(value).toFixed(2);
  };

  return (
    <div className="max-w-6xl mx-auto rounded-xl shadow-lg p-8 m-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Parlay Investment Pool
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors duration-200"
        >
          {isExpanded ? "▼" : "▲"}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left side - Investment Description */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800">
              About this Investment
            </h3>
            <div className="prose text-gray-600">
              <p className="leading-relaxed">
                Send USDC to the parlay contract. The funds will be used to
                underwrite prediction market parlays. You will be issued a yield
                generating investment token.
              </p>
              <ul className="list-disc pl-5 mt-6 space-y-2">
                <li>
                  Turn binary prediction markets into a passive investment
                </li>
                <li>Redeem your funds at any time</li>
              </ul>
            </div>
          </div>

          {/* Right side - Investment Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {address ? (
              <div className="space-y-6">
                {/* USDC Balance Box */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Your USDC Balance
                  </p>
                  {balanceLoading && (
                    <div className="h-8 animate-pulse bg-gray-200 rounded"></div>
                  )}
                  {balanceError && (
                    <p className="text-red-500 text-sm">
                      Error loading balance
                    </p>
                  )}
                  {usdcBalance && (
                    <p className="text-xl font-semibold text-gray-800">
                      {formatNumber(usdcBalance.formatted)}
                    </p>
                  )}
                </div>

                {/* Current Investment Box */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Your Shares
                  </p>
                  {parlayTokenLoading && (
                    <div className="h-8 animate-pulse bg-gray-200 rounded"></div>
                  )}
                  {parlayTokenError && (
                    <p className="text-red-500 text-sm">
                      Error loading Parlay token balance
                    </p>
                  )}
                  {parlayTokenBalance && (
                    <p className="text-xl font-semibold text-gray-800">
                      {formatNumber(parlayTokenBalance.formatted)}
                    </p>
                  )}

                  {errorMessage && (
                    <div
                      className={`p-3 rounded-md my-4 text-sm ${
                        errorMessage.includes("success")
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {errorMessage}
                    </div>
                  )}

                  <button
                    onClick={handleDeposit}
                    disabled={loading || !amount}
                    className={`w-full mt-4 bg-secondary text-black px-6 py-3 rounded-lg font-medium transition-all duration-200
                      ${
                        loading
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-90 hover:shadow-md"
                      }`}
                  >
                    {loading ? "Processing..." : "Deposit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 py-8 bg-gray-50 rounded-lg border border-gray-100">
                Please connect your wallet to invest
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
