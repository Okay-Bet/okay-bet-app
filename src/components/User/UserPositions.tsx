import React, { useState } from "react";
import { usePositions } from "@/hooks/usePositions";
import { useSellPosition } from "@/hooks/useSellPosition";
import { useActiveAccount } from "thirdweb/react";

// Define our interfaces at the top level for better organization and reusability
interface MarketData {
  question: string;
  outcomes: string; // JSON string of outcomes array
  outcome_prices: string; // JSON string of prices array
}

interface Position {
  condition_id: string; // Primary identifier from the API
  token_id: string | null; // Nullable because some legacy positions might not have it
  balances: number[];
  prices: number[];
  outcome: number;
  status: string;
  user_address: string;
  market_data?: MarketData; // Optional because some positions might not have enriched data
}

export default function UserPositions() {
  const { positions, loading, error, isConnected, totalValue } = usePositions();
  const { sellPosition, loading: sellLoading } = useSellPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState("active");

  const isMarketResolved = (prices: number[]): boolean => {
    return prices.some((price) => price === 1.0 || price === 0.0);
  };

  const getWinningOutcome = (prices: number[]): number => {
    return prices.findIndex((price) => price === 1.0);
  };

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

  const PositionCard = ({ position }: { position: Position }) => {
    // Parse market data with fallbacks for legacy positions
    const outcomes = position.market_data
      ? JSON.parse(position.market_data.outcomes)
      : ["Yes", "No"];

    const currentPrices = position.market_data
      ? JSON.parse(position.market_data.outcome_prices)
      : position.prices;

    return (
      <div className="border rounded-lg p-4 bg-white mb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 break-all">
              {position.market_data?.question ||
                `Market ID: ${position.condition_id.slice(0, 16)}...`}
            </h3>
            {position.market_data && (
              <p className="text-sm text-gray-500 mt-1">
                Current Price: Yes ${Number(currentPrices[0]).toFixed(3)} | No $
                {Number(currentPrices[1]).toFixed(3)}
              </p>
            )}
          </div>
          <span
            className={`px-2 py-1 text-sm rounded-full flex-shrink-0 ml-2 ${
              isMarketResolved(position.prices)
                ? "bg-gray-100 text-gray-600"
                : "bg-green-100 text-green-600"
            }`}
          >
            {isMarketResolved(position.prices) ? "Resolved" : "Active"}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-sm text-gray-600">
              {outcomes[position.outcome]}
            </span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-medium">
                  {(position.balances[0] / 1_000_000).toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">
                  @ ${position.prices[0].toFixed(3)}
                </span>
                {position.balances[0] > 0 && (
                  <span className="ml-2 text-gray-500">
                    ($
                    {(
                      (position.balances[0] / 1_000_000) *
                      position.prices[0]
                    ).toFixed(2)}
                    )
                  </span>
                )}
              </div>
              {position.balances[0] > 0 &&
                !isMarketResolved(position.prices) &&
                position.token_id && (
                  <button
                    onClick={() =>
                      handleSell(
                        position.token_id,
                        position.prices[0],
                        position.balances[0],
                        position.outcome === 0
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
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Position Value</span>
            <span className="font-medium">
              $
              {(
                (position.balances[0] / 1_000_000) *
                position.prices[0]
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 p-6">
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

      <div>
        {activeTab === "active" && (
          <div>
            {activePositions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active positions found
              </div>
            ) : (
              activePositions.map((position) => (
                <PositionCard
                  key={position.token_id || position.condition_id}
                  position={position}
                />
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
                <PositionCard
                  key={position.token_id || position.condition_id}
                  position={position}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
