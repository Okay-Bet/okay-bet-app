import React, { useState, useMemo } from "react";
import { usePositions } from "../../hooks/usePositions";
// import { useRedeemPosition, RedeemStatus } from "../../hooks/useRedeemPosition";
import { useWallet } from "../../app/context/WalletContext";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import PositionCard from "./PositionCard";
import { Position, PositionCardProps } from "../types";

// Type definitions remain unchanged
type TabType = "active" | "resolved";
type ResolvedTabType = "winning" | "losing";

type ResolvedPosition = Position & { position_result: "won" | "lost" };
type WinningPosition = Position & { position_result: "won" };
type LosingPosition = Position & { position_result: "lost" };

// Helper functions for position types remain unchanged
const isWinningPosition = (
  position: ResolvedPosition
): position is WinningPosition => {
  return position.position_result === "won";
};

const isLosingPosition = (
  position: ResolvedPosition
): position is LosingPosition => {
  return position.position_result === "lost";
};

const isResolvedPosition = (
  position: Position
): position is ResolvedPosition => {
  return (
    position.position_result === "won" || position.position_result === "lost"
  );
};

// Position card props transformation remains unchanged
const toPositionCardProps = (
  position: Position
): PositionCardProps["position"] => {
  return {
    status: position.status,
    market_data: {
      outcomes: position.market_data.outcomes,
      question: position.market_data.question,
      volume:
        typeof position.market_data.volume === "string"
          ? parseFloat(position.market_data.volume)
          : position.market_data.volume,
      collateral_token: position.market_data.collateral_token,
      description: position.market_data.description,
    },
    outcome: position.outcome,
    token_id: position.token_id,
    current_balance: position.current_balance,
    condition_id: position.condition_id,
    parent_collection_id: position.parent_collection_id,
    winning_outcome: position.winning_outcome,
    isRedeemed: position.isRedeemed,
    position_result: position.position_result,
    expiration_timestamp: position.expiration_timestamp,
  };
};

export const UserPositions: React.FC = () => {
  const {
    positions,
    loading,
    isConnected,
    positionValues,
    getPositionOutcome,
    getMarketResult,
    refreshPositions,
  } = usePositions();
  
  const { address, isConnected: isWalletConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [resolvedTab, setResolvedTab] = useState<ResolvedTabType>("winning");
  const [isComponentExpanded, setIsComponentExpanded] = useState(true);

  // COMMENTED OUT: Redeem position hook will be implemented later
  // const { redeemPosition, status: redeemStatus } = useRedeemPosition(() => {
  //   refreshPositions();
  // });

  // Position sorting and categorization remains unchanged
  const {
    activePositions,
    resolvedPositions,
    activeValue,
    winningPositions,
    losingPositions,
  } = useMemo(() => {
    const active: Position[] = [];
    const resolved: Position[] = [];
    const winning: Position[] = [];
    const losing: Position[] = [];
    let activeTotal = 0;

    positions.forEach((position: Position) => {
      if (position.status.toUpperCase() === "RESOLVED") {
        resolved.push(position);

        if (position.position_result === "won") {
          winning.push(position);
        } else if (position.position_result === "lost") {
          losing.push(position);
        }
      } else {
        // Active position
        active.push(position);
        if (positionValues[position.token_id]) {
          activeTotal += positionValues[position.token_id];
        }
      }
    });

    return {
      activePositions: active,
      resolvedPositions: resolved,
      winningPositions: winning,
      losingPositions: losing,
      activeValue: activeTotal,
    };
  }, [positions, positionValues]);

  // COMMENTED OUT: Redeem functionality will be implemented later
  // Placeholder handleRedeem function
  const handleRedeem = async (
    tokenId: string,
    isYesToken: boolean,
    conditionId: string,
    parentCollectionId: string
  ): Promise<void> => {
    console.log("Redeem functionality temporarily disabled");
  };

  const renderPositions = (positions: Position[]) => {
    if (positions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No positions found</div>
      );
    }

    return positions.map((position) => {
      // COMMENTED OUT: Redeem status checking will be implemented later
      // const isRedeeming =
      //   redeemStatus.state === "redeeming" &&
      //   redeemStatus.tokenId === position.token_id;

      const positionCardProps: PositionCardProps = {
        position: toPositionCardProps(position),
        value: positionValues[position.token_id] || 0,
        positionOutcome: getPositionOutcome(position),
        marketResult: getMarketResult(position),
        onRedeem: handleRedeem,
        // COMMENTED OUT: Redeem functionality will be implemented later
        canRedeem: false, // Temporarily disabled
        isRedeeming: false, // Temporarily disabled
      };

      return <PositionCard key={position.token_id} {...positionCardProps} />;
    });
  };

  // Wallet connection check
  if (!isWalletConnected) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-white to-gray-200 p-1 border border-gray-200/80">
        <div className="bg-white rounded-lg p-8">
          <Wallet className="mx-auto h-16 w-16 text-accent-red-500" />
          <h3 className="mt-4 text-xl font-header text-gray-800 text-center">
            CONNECT WALLET
          </h3>
          <p className="mt-2 text-sm font-body text-gray-500 text-center">
            Connect your wallet to view positions
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-white to-gray-200 p-1 border border-gray-200/80">
        <div className="bg-white rounded-lg p-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-l-2 border-accent-red-500" />
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-md border border-gray-200/80 mb-5">
      <div className="rounded-lg overflow-hidden">
        {/* Header section */}
        <div
          className="px-8 py-6 cursor-pointer bg-gradient-to-r from-gray-100 to-white hover:from-white hover:to-gray-100 
                     transition-all duration-300 border-b border-gray-200"
          onClick={() => setIsComponentExpanded(!isComponentExpanded)}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-3xl font-header text-gray-800 tracking-wide">
                POSITIONS
              </h2>
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-accent-red-500 text-white">
                {activePositions.length} ACTIVE
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-header text-accent-red-500">
                  ${activeValue.toFixed(2)}
                </div>
                {resolvedPositions.length > 0 && (
                  <div className="text-sm font-medium text-gray-500 mt-1">
                    Won: {winningPositions.length} / Lost:{" "}
                    {losingPositions.length}
                  </div>
                )}
              </div>
              {isComponentExpanded ? (
                <ChevronUp className="h-6 w-6 text-accent-red-500 hover:text-accent-red-400 transition-colors" />
              ) : (
                <ChevronDown className="h-6 w-6 text-accent-red-500 hover:text-accent-red-400 transition-colors" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isComponentExpanded && (
          <div>
            {/* Statistics cards */}
            <div className="p-6 bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div
                  className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white to-gray-100 
                              rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="text-gray-500 font-medium mb-2">
                    Active Positions
                  </div>
                  <div className="text-3xl font-header text-accent-red-500">
                    {activePositions.length}
                  </div>
                </div>
                <div
                  className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white to-gray-100 
                              rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="text-gray-500 font-medium mb-2">
                    Resolved Positions
                  </div>
                  <div className="text-3xl font-header text-accent-red-500">
                    {resolvedPositions.length}
                    {resolvedPositions.length > 0 && (
                      <span className="text-lg ml-2 font-medium text-green-500">
                        ({winningPositions.length} Won)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="border-t border-gray-200 bg-white">
              <div className="px-6 py-4 flex justify-center space-x-6">
                <button
                  className={`py-3 px-8 text-lg font-header rounded-lg transition-all duration-300 ${
                    activeTab === "active"
                      ? "bg-accent-red-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("active")}
                >
                  ACTIVE ({activePositions.length})
                </button>
                <button
                  className={`py-3 px-8 text-lg font-header rounded-lg transition-all duration-300 ${
                    activeTab === "resolved"
                      ? "bg-accent-red-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("resolved")}
                >
                  RESOLVED ({resolvedPositions.length})
                </button>
              </div>
            </div>

            {/* Positions list */}
            <div className="max-h-[32rem] overflow-y-auto px-6 pb-6 bg-white">
              {activeTab === "active" && (
                <div className="space-y-4 mt-4">
                  {renderPositions(activePositions)}
                </div>
              )}
              {activeTab === "resolved" && (
                <div>
                  <div className="flex justify-center space-x-4 py-3">
                    <button
                      className={`py-2 px-6 text-sm font-header rounded-lg transition-all duration-300 ${
                        resolvedTab === "winning"
                          ? "bg-green-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      }`}
                      onClick={() => setResolvedTab("winning")}
                    >
                      WON ({winningPositions.length})
                    </button>
                    <button
                      className={`py-2 px-6 text-sm font-header rounded-lg transition-all duration-300 ${
                        resolvedTab === "losing"
                          ? "bg-accent-red-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      }`}
                      onClick={() => setResolvedTab("losing")}
                    >
                      LOST ({losingPositions.length})
                    </button>
                  </div>
                  <div className="space-y-4 mt-4">
                    {renderPositions(
                      resolvedTab === "winning"
                        ? winningPositions
                        : losingPositions
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPositions;