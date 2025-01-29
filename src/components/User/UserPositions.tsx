import React, { useState, useMemo } from "react";
import { usePositions } from "../../hooks/usePositions";
import { useSellPosition } from "../../hooks/useSellPosition";
import { useActiveAccount } from "thirdweb/react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import PositionCard from "./PositionCard";
import { Position, PositionValues } from "../types";

type TabType = "active" | "resolved";

const UserPositions: React.FC = () => {
  const { positions, loading, isConnected, positionValues } = usePositions();
  const { sellPosition, loading: sellLoading } = useSellPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [isComponentExpanded, setIsComponentExpanded] = useState(true);

  const { activePositions, resolvedPositions, activeValue } = useMemo(() => {
    const active: Position[] = [];
    const resolved: Position[] = [];
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

  const handleSell = async (
    tokenId: string,
    amount: number,
    isYesToken: boolean,
    price: number
  ): Promise<void> => {
    console.log("🎯 handleSell called with:", {
      tokenId,
      amount,
      isYesToken,
      price,
    });

    if (!account?.address) {
      console.error("Wallet not connected");
      return;
    }

    try {
      console.log("🚀 Selling position with params:", {
        tokenId,
        amount,
        isYesToken}
      )

      await sellPosition({
        token_id: tokenId,
        price,
        amount,
        is_yes_token: isYesToken,
      });
      // window.location.reload();
    } catch (error) {
      console.error("Failed to sell position:", error);
    }
  };

  const handleRedeem = async (tokenId: string): Promise<void> => {
    // Implement redeem logic here
    console.log("Redeeming position:", tokenId);
  };

  const renderPositions = (positions: Position[]) => {
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
};

export default UserPositions;
