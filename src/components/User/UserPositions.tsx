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
    <div className="rounded-xl border border-gray-200 shadow-sm bg-white">
      <div
        className="px-6 py-5 cursor-pointer flex justify-between items-center bg-gradient-to-r from-gray-50 to-white"
        onClick={() => setIsComponentExpanded(!isComponentExpanded)}
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Your Positions</h2>
          <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
            {activePositions.length} Active
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              ${activeValue.toFixed(2)}
            </div>
            {resolvedPositions.length > 0 && (
              <div className="text-sm font-medium text-gray-500 mt-0.5">
                Won: {winningPositions.length} / Lost: {losingPositions.length}
              </div>
            )}
          </div>
          {isComponentExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          )}
        </div>
      </div>

      {isComponentExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Active Positions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {activePositions.length}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Resolved Positions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {resolvedPositions.length}
                  {resolvedPositions.length > 0 && (
                    <span className="text-base ml-2 font-medium text-green-600">
                      ({winningPositions.length} Won)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white">
            <div className="px-6 py-3 flex justify-center space-x-6">
              <button
                className={`py-2.5 px-6 text-base font-medium rounded-full transition-all duration-200 ${
                  activeTab === "active"
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("active")}
              >
                Active ({activePositions.length})
              </button>
              <button
                className={`py-2.5 px-6 text-base font-medium rounded-full transition-all duration-200 ${
                  activeTab === "resolved"
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("resolved")}
              >
                Resolved ({resolvedPositions.length})
              </button>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto px-6 pb-6">
            {activeTab === "active" && (
              <div className="space-y-4 mt-4">{renderPositions(activePositions)}</div>
            )}
            {activeTab === "resolved" && (
              <div>
                <div className="flex justify-center space-x-4 py-3">
                  <button
                    className={`py-1.5 px-4 text-sm font-medium rounded-full transition-all duration-200 ${
                      resolvedTab === "winning"
                        ? "bg-green-50 text-green-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setResolvedTab("winning")}
                  >
                    Won ({winningPositions.length})
                  </button>
                  <button
                    className={`py-1.5 px-4 text-sm font-medium rounded-full transition-all duration-200 ${
                      resolvedTab === "losing"
                        ? "bg-red-50 text-red-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setResolvedTab("losing")}
                  >
                    Lost ({losingPositions.length})
                  </button>
                </div>
                <div className="space-y-4 mt-2">
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
);};

export default UserPositions;
