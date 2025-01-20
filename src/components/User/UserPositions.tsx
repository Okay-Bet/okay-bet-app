import React, { useState, useMemo } from "react";
import { usePositions } from "../../hooks/usePositions";
import { useSellPosition } from "../../hooks/useSellPosition";
import { useActiveAccount } from "thirdweb/react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { BasePosition as ImportedPosition } from "../types";

interface MarketData {
  question: string;
  outcomes: string;
  outcome_prices: string;
}

// Extend the imported Position type with additional properties
interface Position extends ImportedPosition {
  token_id: string | null;
  balances: number[];
  prices: number[];
  user_address: string;
  market_data?: MarketData;
}

type PositionStatus = "active" | "resolved" | "pending";

const PositionCard: React.FC<{
  position: Position;
  onSell: (
    tokenId: string,
    price: number,
    amount: number,
    isYesToken: boolean
  ) => Promise<void>;
  sellLoading: boolean;
}> = ({ position, onSell, sellLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse market data safely
  const currentPrices = useMemo(() => {
    try {
      const prices = position.market_data
        ? JSON.parse(position.market_data.outcome_prices)
        : position.prices;

      // Ensure all prices are numbers
      return Array.isArray(prices)
        ? prices.map((price) => Number(price))
        : position.prices;
    } catch (error) {
      console.warn(
        "Error parsing prices, falling back to position.prices:",
        error
      );
      return position.prices;
    }
  }, [position.market_data, position.prices]);

  const outcomes = useMemo(() => {
    try {
      return position.market_data
        ? JSON.parse(position.market_data.outcomes)
        : ["Yes", "No"];
    } catch (error) {
      console.warn("Error parsing outcomes, using default:", error);
      return ["Yes", "No"];
    }
  }, [position.market_data]);

  // Ensure numeric calculations
  const currentPrice = Number(currentPrices[position.outcome]) || 0;
  const amount = position.balances[0] / 1_000_000;
  const positionValue = amount * currentPrice;

  return (
    <div className="border rounded-lg p-4 bg-white mb-4 transition-all duration-200">
      <div
        className="flex justify-between items-start cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 break-all">
            {position.market_data?.question ||
              `Market ${position.condition_id.slice(0, 8)}...`}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Position Value: ${positionValue.toFixed(2)} | Outcome:{" "}
            {outcomes[position.outcome]}
          </p>
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
              <span className="text-gray-500">Current Price:</span>
              <span className="ml-2 font-medium">
                ${currentPrices[position.outcome].toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <span className="ml-2 font-medium">
                {(position.balances[0] / 1_000_000).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Market ID:</span>
              <span className="ml-2 font-medium">
                {position.condition_id.slice(0, 8)}...
              </span>
            </div>
            <div>
              <span className="text-gray-500">Token ID:</span>
              <span className="ml-2 font-medium">
                {position.token_id
                  ? position.token_id.slice(0, 8) + "..."
                  : "N/A"}
              </span>
            </div>
          </div>

          {position.token_id && (
            <div className="flex justify-end mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSell(
                    position.token_id!,
                    position.prices[position.outcome],
                    position.balances[0],
                    position.outcome === 0
                  );
                }}
                disabled={sellLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 
                         disabled:bg-red-300 transition-colors"
              >
                {sellLoading ? "Selling..." : "Sell Position"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function UserPositions() {
  const { positions, loading, error, isConnected, totalValue } = usePositions();
  const { sellPosition, loading: sellLoading } = useSellPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<PositionStatus>("active");
  const [isComponentExpanded, setIsComponentExpanded] = useState(true);

  // Type guard to ensure position has required properties
  const isValidPosition = (
    position: ImportedPosition
  ): position is Position => {
    return (
      "token_id" in position &&
      "balances" in position &&
      "prices" in position &&
      "outcome" in position &&
      "status" in position &&
      "user_address" in position
    );
  };

  const determinePositionStatus = (position: Position): PositionStatus => {
    const isResolved =
      position.prices.some((price) => price === 1.0) ||
      position.prices.every((price) => price === 0.0);

    if (isResolved) return "resolved";
    if (position.balances.some((balance) => balance > 0)) return "active";
    return "pending";
  };

  const {
    activePositions,
    resolvedPositions,
    pendingPositions,
    totalUnrealizedPnL,
  } = useMemo(() => {
    // Filter out invalid positions first
    const validPositions = positions.filter(isValidPosition);

    const categorizedPositions = validPositions.reduce(
      (acc, position) => {
        const status = determinePositionStatus(position);
        acc[`${status}Positions`].push(position);
        return acc;
      },
      {
        activePositions: [] as Position[],
        resolvedPositions: [] as Position[],
        pendingPositions: [] as Position[],
      }
    );

    const totalUnrealizedPnL = categorizedPositions.activePositions.reduce(
      (total, position) => {
        const amount = position.balances[0] / 1_000_000;
        const currentPrice = position.prices[position.outcome];
        const estimatedPnL = amount * currentPrice;
        return total + estimatedPnL;
      },
      0
    );

    return {
      ...categorizedPositions,
      totalUnrealizedPnL,
    };
  }, [positions]);

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

  const renderPositions = (positions: Position[]) => {
    if (positions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No positions found</div>
      );
    }

    return positions.map((position) => (
      <PositionCard
        key={position.token_id || position.condition_id}
        position={position}
        onSell={handleSell}
        sellLoading={sellLoading}
      />
    ));
  };

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Header - always visible */}
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
              Portfolio Value: ${totalValue.toFixed(2)}
            </div>
          </div>
          {isComponentExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Collapsible content */}
      {isComponentExpanded && (
        <div className="border-t border-gray-200">
          {/* Portfolio stats */}
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Unrealized Value</div>
                <div className="text-lg font-semibold text-gray-900">
                  ${totalUnrealizedPnL.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Positions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {positions.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
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
              <button
                className={`py-2 px-1 text-sm font-medium ${
                  activeTab === "pending"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("pending")}
              >
                Pending ({pendingPositions.length})
              </button>
            </div>
          </div>

          {/* Positions list */}
          <div className="max-h-96 overflow-y-auto p-4">
            {activeTab === "active" && renderPositions(activePositions)}
            {activeTab === "resolved" && renderPositions(resolvedPositions)}
            {activeTab === "pending" && renderPositions(pendingPositions)}
          </div>
        </div>
      )}
    </div>
  );
}
