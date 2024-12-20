import React, { useState } from "react";
import { usePositions } from "@/hooks/usePositions";
import { useSellPosition } from "@/hooks/useSellPosition";
import { useActiveAccount } from "thirdweb/react";

export default function UserPositions() {
  const { positions, loading, error, isConnected, totalValue } = usePositions();
  const { sellPosition, loading: sellLoading } = useSellPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState("active");

  // Helper to determine if market is resolved based on prices
  const isMarketResolved = (prices: number[]): boolean => {
    return prices.some((price) => price === 1.0 || price === 0.0);
  };

  // Helper to get winning outcome index
  const getWinningOutcome = (prices: number[]): number => {
    return prices.findIndex((price) => price === 1.0);
  };

  // Filter positions
  const activePositions = positions.filter((p) => !isMarketResolved(p.prices));
  const resolvedPositions = positions.filter((p) => isMarketResolved(p.prices));

  const handleSell = async (
    tokenId: string,
    price: number,
    amount: number,
    isYesToken: boolean
  ) => {
    if (!account?.address) return;
    try {
      await sellPosition({
        token_id: tokenId,
        price,
        amount,
        is_yes_token: isYesToken,
        user_address: account.address,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to sell position:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900">Connect Wallet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your wallet to view positions
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  const PositionCard = ({ position }) => (
    <div className="border rounded-lg p-4 bg-white mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-gray-900">
          {position.market_question}
        </h3>
        <span
          className={`px-2 py-1 text-sm rounded-full ${
            isMarketResolved(position.prices)
              ? "bg-gray-100 text-gray-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {isMarketResolved(position.prices) ? "Resolved" : "Active"}
        </span>
      </div>

      <div className="space-y-2">
        {position.outcomes.map((outcome, index) => (
          <div
            key={index}
            className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm text-gray-600">{outcome}</span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-medium">
                  {(position.balances[index] / 1_000_000).toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">
                  @ ${position.prices[index].toFixed(3)}
                </span>
                {position.balances[index] > 0 && (
                  <span className="ml-2 text-gray-500">
                    ($
                    {(
                      (position.balances[index] / 1_000_000) *
                      position.prices[index]
                    ).toFixed(2)}
                    )
                  </span>
                )}
              </div>
              {position.balances[index] > 0 &&
                !isMarketResolved(position.prices) && (
                  <button
                    onClick={() =>
                      handleSell(
                        position.token_id,
                        position.prices[index],
                        position.balances[index],
                        index === 0
                      )
                    }
                    disabled={sellLoading}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 
                           disabled:bg-red-300"
                  >
                    {sellLoading ? "Selling..." : "Sell"}
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {isMarketResolved(position.prices) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Winning Outcome:{" "}
            {position.outcomes[getWinningOutcome(position.prices)]}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Position Value</span>
          <span className="font-medium">
            $
            {position.balances
              .reduce(
                (sum, balance, index) =>
                  sum + (balance / 1_000_000) * position.prices[index],
                0
              )
              .toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">Your Positions</h2>
          <p className="text-sm text-gray-500">Manage your market positions</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Portfolio Value</div>
          <div className="text-2xl font-bold text-green-600">
            ${totalValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-4">
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === "active"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("active")}
          >
            Active ({activePositions.length})
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === "resolved"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("resolved")}
          >
            Resolved ({resolvedPositions.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "active" && (
          <div>
            {activePositions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active positions found
              </div>
            ) : (
              activePositions.map((position) => (
                <PositionCard key={position.token_id} position={position} />
              ))
            )}
          </div>
        )}

        {activeTab === "resolved" && (
          <div>
            {resolvedPositions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No resolved positions found
              </div>
            ) : (
              resolvedPositions.map((position) => (
                <PositionCard key={position.token_id} position={position} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
