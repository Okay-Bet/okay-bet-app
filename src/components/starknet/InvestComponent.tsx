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
    userInvestment,
    usdcBalance,
    balanceLoading,
    balanceError,
  } = useInvestment();

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6 m-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-bold text-black">
          Parlay Investment Pool
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 hover:bg-gray-100 rounded-full text-xl"
        >
          {isExpanded ? "▼" : "▲"}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Investment Description */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-black">
              About this Investment
            </h3>
            <div className="prose text-gray-600">
              <p>
                Send USDC to the parlay contract. The funds will be used to
                underwrite prediction market parlays. You will be issued a yield
                generating investment token.
              </p>
              <ul className="list-disc pl-5 mt-4">
                <li>
                  Turn binary prediction markets into a passive investment
                </li>
                <li>Redeem your funds at any time</li>
              </ul>
            </div>
          </div>

          {/* Right side - Investment Form */}
          <div className="bg-gray-50 p-6 rounded-lg">
            {address ? (
              <div className="space-y-6">
                {/* USDC Balance Box */}
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Your USDC Balance</p>
                  {balanceLoading && (
                    <p className="text-2xl font-bold text-black">Loading...</p>
                  )}
                  {balanceError && (
                    <p className="text-red-500">Error loading balance</p>
                  )}
                  {usdcBalance && (
                    <p className="text-2xl font-bold text-black">
                      {usdcBalance.formatted} {usdcBalance.symbol}
                    </p>
                  )}
                </div>

                {/* Current Investment Box */}
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">
                    Your Current Investment
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {userInvestment} USDC
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black">
                      Amount to Deposit
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 text-black rounded-md shadow-sm p-2"
                      placeholder="Enter amount in USDC"
                    />
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={loading || !amount}
                    className={`w-full bg-secondary text-black px-6 py-3 rounded-lg font-medium
                      ${
                        loading
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-90"
                      }`}
                  >
                    {loading ? "Processing..." : "Deposit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 py-8">
                Please connect your wallet to invest
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
