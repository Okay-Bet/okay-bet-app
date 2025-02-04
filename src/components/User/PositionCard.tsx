import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PositionCardProps } from "../types";

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  value,
  // onSell,
  onRedeem,
  canRedeem,
}) => {
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

  // const handleSellClick = (e: React.MouseEvent) => {
  //   e.stopPropagation(); // Prevent expanding/collapsing when clicking sell
  //   onSell(position.token_id, position.current_balance, isYesToken, value);
  // };

  const handleRedeemClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking redeem
    onRedeem(
      position.token_id,
      isYesToken,
      position.condition_id,
      position.parent_collection_id || ""
    );
  };

  const getPositionDetails = () => {
    const positionText = outcomes[position.outcome];
    if (!isResolved) {
      return positionText;
    }
    const winningOutcomeText =
      position.winning_outcome !== undefined
        ? outcomes[position.winning_outcome]
        : "Pending";
    return `${positionText} • Winner: ${winningOutcomeText}`;
  };

  const getStatusBadge = () => {
    if (!isResolved) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          Active
        </span>
      );
    }

    if (position.isRedeemed) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          Redeemed
        </span>
      );
    }

    if (position.position_result === "won") {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          Won
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
        Lost
      </span>
    );
  };

  const formatBalance = (balance: number, decimals: number) => {
    return (balance / Math.pow(10, decimals)).toFixed(2);
  };

  return (
    <div className="card-aggressive">
      <div className="bg-accent-gray-900 rounded-xl overflow-hidden">
        <div
          className="p-6 cursor-pointer bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 hover:from-accent-gray-900 hover:to-accent-gray-800 transition-all duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-header text-white leading-tight flex-1 pr-4">
                  {position.market_data.question}
                </h3>
                {!isResolved ? (
                  <span className="px-3 py-1 text-sm font-header bg-electric-cyan text-black rounded-lg shadow-sharp">
                    ACTIVE
                  </span>
                ) : position.isRedeemed ? (
                  <span className="px-3 py-1 text-sm font-header bg-accent-gray-600 text-white rounded-lg shadow-sharp">
                    REDEEMED
                  </span>
                ) : position.position_result === "won" ? (
                  <span className="px-3 py-1 text-sm font-header bg-green-500 text-white rounded-lg shadow-sharp">
                    WON
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-header bg-accent-red-500 text-white rounded-lg shadow-sharp">
                    LOST
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-accent-gray-400">
                    Position:
                  </span>
                  <span className="text-sm font-medium text-white">
                    {getPositionDetails()}
                  </span>
                </div>

                {!isResolved && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-accent-gray-400">Value:</span>
                    <span className="text-sm font-header text-electric-cyan">
                      ${value.toFixed(2)}
                    </span>
                  </div>
                )}

                {isResolved && position.current_balance > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-accent-gray-400">
                      Balance:
                    </span>
                    <span className="text-sm font-header text-accent-red-500">
                      {formatBalance(
                        position.current_balance,
                        position.market_data.collateral_token.decimals
                      )}{" "}
                      USDC
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-accent-red-500">
              {isExpanded ? (
                <ChevronUp className="h-6 w-6" />
              ) : (
                <ChevronDown className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-accent-gray-800">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 p-4 rounded-lg border border-accent-gray-700">
                  <div className="text-sm text-accent-gray-400 mb-1">
                    Market Volume
                  </div>
                  <div className="font-header text-xl text-accent-red-500">
                    ${position.market_data.volume}
                  </div>
                </div>
                <div className="bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 p-4 rounded-lg border border-accent-gray-700">
                  <div className="text-sm text-accent-gray-400 mb-1">
                    Expiration
                  </div>
                  <div className="font-header text-xl text-accent-red-500">
                    {new Date(
                      position.expiration_timestamp
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-sharp from-accent-gray-800 to-accent-gray-900 p-4 rounded-lg border border-accent-gray-700">
                <div className="text-sm text-accent-gray-300">
                  {position.market_data.description}
                </div>
              </div>

              <div className="pt-2">
                {!isResolved ? (
                  <div className="text-center font-header text-electric-cyan bg-accent-gray-800 p-4 rounded-lg shadow-inner-sharp">
                    MARKET IS STILL ACTIVE
                  </div>
                ) : (
                  <div className="space-y-2">
                    {position.isRedeemed ? (
                      <div className="text-center font-header text-green-500 bg-accent-gray-800 p-4 rounded-lg shadow-inner-sharp">
                        POSITION HAS BEEN REDEEMED
                      </div>
                    ) : position.position_result === "won" ? (
                      canRedeem ? (
                        <button
                          onClick={handleRedeemClick}
                          className="w-full bg-gradient-aggressive from-accent-red-500 to-tertiary text-white py-4 px-6 rounded-lg font-header text-lg hover:shadow-aggressive transition-all duration-300 shadow-sharp"
                        >
                          REDEEM WINNINGS
                        </button>
                      ) : (
                        <div className="text-center font-header text-accent-gray-400 bg-accent-gray-800 p-4 rounded-lg shadow-inner-sharp">
                          NO BALANCE TO REDEEM
                        </div>
                      )
                    ) : (
                      <div className="text-center font-header text-accent-red-500 bg-accent-gray-800 p-4 rounded-lg shadow-inner-sharp">
                        POSITION LOST
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionCard;
