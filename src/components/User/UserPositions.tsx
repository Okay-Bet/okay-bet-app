import React, { useState, useMemo } from "react";
import { usePositions } from "../../hooks/usePositions";
import { useSellPosition } from "../../hooks/useSellPosition";
import { useActiveAccount } from "thirdweb/react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";

const PositionCard = ({ position, value, onSell, onRedeem, sellLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isResolved = position.status.toUpperCase() === "RESOLVED";

  const outcomes = useMemo(() => {
    try {
      return JSON.parse(position.market_data.outcomes);
    } catch (error) {
      console.warn("Error parsing outcomes, using default:", error);
      return ["No", "Yes"];
    }
  }, [position.market_data.outcomes]);

  const isYesToken = position.outcome === 1;

  return (
    <div className="border rounded-lg p-4 bg-white mb-4 transition-all duration-200">
      <div
        className="flex justify-between items-start cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 break-all">
            {position.market_data.question}
          </h3>
          <div className="text-sm text-gray-500 mt-1">
            <p>
              {outcomes[position.outcome]}
              {position.is_winner !== undefined && (
                <span
                  className={`ml-2 ${
                    position.is_winner ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {position.is_winner ? "(Won)" : "(Lost)"}
                </span>
              )}
            </p>
            {!isResolved && (
              <p className="text-sm font-medium text-gray-900">
                Position Value: ${value.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Market Volume:</span>
              <span className="ml-2 font-medium">
                ${position.market_data.volume}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Expiration:</span>
              <span className="ml-2 font-medium">
                {new Date(position.expiration_timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-2">
            <p>{position.market_data.description}</p>
          </div>

          <div className="pt-3">
            {!isResolved ? (
              <button
                onClick={() =>
                  onSell(
                    position.token_id,
                    position.current_balance,
                    isYesToken,
                    value
                  )
                }
                disabled={sellLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {sellLoading ? "Processing..." : "Sell Position"}
              </button>
            ) : (
              <button
                onClick={() => onRedeem(position.token_id)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Redeem Winnings
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UserPositions() {
  const { positions, loading, error, isConnected, positionValues } =
    usePositions();
  const { sellPosition, loading: sellLoading } = useSellPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState("active");
  const [isComponentExpanded, setIsComponentExpanded] = useState(true);

  const { activePositions, resolvedPositions, activeValue } = useMemo(() => {
    const active = [];
    const resolved = [];
    let activeTotal = 0;

    positions.forEach((position) => {
      if (position.status.toUpperCase() === "RESOLVED") {
        resolved.push(position);
      } else {
        active.push(position);
        activeTotal += positionValues[position.token_id] || 0;
      }
    });

    return {
      activePositions: active,
      resolvedPositions: resolved,
      activeValue: activeTotal,
    };
  }, [positions, positionValues]);

  const handleSell = async (tokenId, amount, isYesToken, price) => {
    if (!account?.address) {
      console.error("Wallet not connected");
      return;
    }

    try {
      await sellPosition({
        token_id: tokenId,
        price,
        amount,
        is_yes_token: isYesToken,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to sell position:", error);
    }
  };

  const handleRedeem = async (tokenId) => {
    // Implement redeem logic here
    console.log("Redeeming position:", tokenId);
  };

  const renderPositions = (positions) => {
    if (positions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No positions found</div>
      );
    }

    return positions.map((position) => (
      <PositionCard
        key={position.token_id}
        position={position}
        value={positionValues[position.token_id] || 0}
        onSell={handleSell}
        onRedeem={handleRedeem}
        sellLoading={sellLoading}
      />
    ));
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Wallet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            Connect Wallet
          </h3>
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

  return (
    <div className="rounded-lg border border-gray-200">
      <div
        className="p-4 cursor-pointer flex justify-between items-center bg-white"
        onClick={() => setIsComponentExpanded(!isComponentExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold text-gray-900">Your Positions</h2>
          <span className="text-sm text-gray-500">
            ({activePositions.length} Active)
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right mr-4">
            <div className="text-sm font-medium text-gray-900">
              Portfolio Value: ${activeValue.toFixed(2)}
            </div>
          </div>
          {isComponentExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>

      {isComponentExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Active Positions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {activePositions.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Resolved Positions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {resolvedPositions.length}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <div className="px-4 flex space-x-4">
              <button
                className={`py-2 px-1 text-sm font-medium ${
                  activeTab === "active"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("active")}
              >
                Active ({activePositions.length})
              </button>
              <button
                className={`py-2 px-1 text-sm font-medium ${
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

          <div className="max-h-96 overflow-y-auto p-4">
            {activeTab === "active" && renderPositions(activePositions)}
            {activeTab === "resolved" && renderPositions(resolvedPositions)}
          </div>
        </div>
      )}
    </div>
  );
}
