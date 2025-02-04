import React, { useState, useMemo } from "react";
import { usePositions } from "../../hooks/usePositions";
import { useRedeemPosition } from "../../hooks/useRedeemPosition";
import { useActiveAccount } from "thirdweb/react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import PositionCard from "./PositionCard";
import { Position, PositionCardProps } from "../types";

type TabType = "active" | "resolved";
type ResolvedTabType = "winning" | "losing";

type ResolvedPosition = Position & { position_result: "won" | "lost" };
type WinningPosition = Position & { position_result: "won" };
type LosingPosition = Position & { position_result: "lost" };

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

const UserPositions: React.FC = () => {
  const {
    positions,
    loading,
    isConnected,
    positionValues,
    getPositionOutcome,
    getMarketResult,
  } = usePositions();
  const { redeemPosition } = useRedeemPosition();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [resolvedTab, setResolvedTab] = useState<ResolvedTabType>("winning");
  const [isComponentExpanded, setIsComponentExpanded] = useState(true);

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

  const handleRedeem = async (
    tokenId: string,
    isYesToken: boolean,
    conditionId: string,
    parentCollectionId: string
  ): Promise<void> => {
    if (!account?.address) {
      console.error("Wallet not connected");
      return;
    }

    try {
      const formattedTokenId = tokenId.startsWith("0x")
        ? tokenId
        : `0x${tokenId}`;
      const formattedConditionId = conditionId.startsWith("0x")
        ? conditionId
        : `0x${conditionId}`;
      const formattedParentCollectionId = parentCollectionId.startsWith("0x")
        ? parentCollectionId
        : `0x${parentCollectionId}`;

      await redeemPosition({
        token_id: formattedTokenId as `0x${string}`,
        is_yes_token: isYesToken,
        condition_id: formattedConditionId as `0x${string}`,
        parent_collection_id: formattedParentCollectionId as `0x${string}`,
      });
    } catch (error) {
      console.error("Failed to redeem position:", error);
    }
  };

  const renderPositions = (positions: Position[]) => {
    if (positions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No positions found</div>
      );
    }

    return positions.map((position) => {
      const positionCardProps: PositionCardProps = {
        position: toPositionCardProps(position),
        value: positionValues[position.token_id] || 0,
        positionOutcome: getPositionOutcome(position),
        marketResult: getMarketResult(position),
        onRedeem: handleRedeem,
        canRedeem:
          isResolvedPosition(position) &&
          position.position_result === "won" &&
          !position.isRedeemed &&
          position.current_balance > 0,
      };

      return <PositionCard key={position.token_id} {...positionCardProps} />;
    });
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg bg-gradient-harsh from-accent-gray-800 to-accent-gray-900 p-1">
        <div className="bg-accent-gray-900 rounded-lg p-8">
          <Wallet className="mx-auto h-16 w-16 text-accent-red-500" />
          <h3 className="mt-4 text-xl font-header text-white text-center">
            CONNECT WALLET
          </h3>
          <p className="mt-2 text-sm font-body text-accent-gray-400 text-center">
            Connect your wallet to view positions
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-gradient-sharp from-accent-red-500 to-accent-red-600 p-1">
        <div className="bg-accent-gray-900 rounded-lg p-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-l-2 border-accent-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-aggressive from-accent-red-500 via-secondary to-tertiary p-0.5 shadow-aggressive mb-5">
      <div className="rounded-xl bg-accent-gray-900 overflow-hidden">
        <div
          className="px-8 py-6 cursor-pointer flex justify-between items-center bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 hover:from-accent-gray-900 hover:to-accent-gray-800 transition-all duration-300"
          onClick={() => setIsComponentExpanded(!isComponentExpanded)}
        >
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-header text-white tracking-wide">YOUR POSITIONS</h2>
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-accent-red-500 text-white shadow-sharp">
              {activePositions.length} ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <div className="text-2xl font-header text-accent-red-500">
                ${activeValue.toFixed(2)}
              </div>
              {resolvedPositions.length > 0 && (
                <div className="text-sm font-medium text-accent-gray-400 mt-1">
                  Won: {winningPositions.length} / Lost: {losingPositions.length}
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

        {isComponentExpanded && (
          <div className="border-t border-accent-gray-800">
            <div className="p-6 bg-accent-gray-900">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 rounded-lg border border-accent-gray-700 shadow-sharp hover:shadow-aggressive transition-all duration-300">
                  <div className="text-accent-gray-400 font-medium mb-2">Active Positions</div>
                  <div className="text-3xl font-header text-accent-red-500">
                    {activePositions.length}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 rounded-lg border border-accent-gray-700 shadow-sharp hover:shadow-aggressive transition-all duration-300">
                  <div className="text-accent-gray-400 font-medium mb-2">Resolved Positions</div>
                  <div className="text-3xl font-header text-accent-red-500">
                    {resolvedPositions.length}
                    {resolvedPositions.length > 0 && (
                      <span className="text-lg ml-2 font-medium text-electric-cyan">
                        ({winningPositions.length} Won)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-accent-gray-800 bg-accent-gray-900">
              <div className="px-6 py-4 flex justify-center space-x-6">
                <button
                  className={`py-3 px-8 text-lg font-header rounded-lg transition-all duration-300 ${
                    activeTab === "active"
                      ? "bg-accent-red-500 text-white shadow-sharp"
                      : "text-accent-gray-400 hover:text-white hover:bg-accent-gray-800"
                  }`}
                  onClick={() => setActiveTab("active")}
                >
                  ACTIVE ({activePositions.length})
                </button>
                <button
                  className={`py-3 px-8 text-lg font-header rounded-lg transition-all duration-300 ${
                    activeTab === "resolved"
                      ? "bg-accent-red-500 text-white shadow-sharp"
                      : "text-accent-gray-400 hover:text-white hover:bg-accent-gray-800"
                  }`}
                  onClick={() => setActiveTab("resolved")}
                >
                  RESOLVED ({resolvedPositions.length})
                </button>
              </div>
            </div>

            <div className="max-h-[32rem] overflow-y-auto px-6 pb-6 bg-accent-gray-900">
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
                          ? "bg-green-500 text-white shadow-sharp"
                          : "text-accent-gray-400 hover:text-white hover:bg-accent-gray-800"
                      }`}
                      onClick={() => setResolvedTab("winning")}
                    >
                      WON ({winningPositions.length})
                    </button>
                    <button
                      className={`py-2 px-6 text-sm font-header rounded-lg transition-all duration-300 ${
                        resolvedTab === "losing"
                          ? "bg-accent-red-500 text-white shadow-sharp"
                          : "text-accent-gray-400 hover:text-white hover:bg-accent-gray-800"
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