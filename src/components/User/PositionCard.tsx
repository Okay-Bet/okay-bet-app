import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PositionCardProps } from "../types";

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  value,
  // onSell,
  onRedeem,
  canRedeem,
  isRedeeming,
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
    <div
      className="bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-md hover:shadow-lg 
                    transition-all duration-300 border border-gray-200/80 w-full"
    >
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-100 to-white">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-header text-gray-800 leading-tight flex-1 pr-4">
                  {position.market_data.question}
                </h3>
                {!isResolved ? (
                  <span className="px-3 py-1 text-sm font-header bg-blue-500 text-white rounded-lg">
                    ACTIVE
                  </span>
                ) : position.isRedeemed ? (
                  <span className="px-3 py-1 text-sm font-header bg-gray-500 text-white rounded-lg">
                    REDEEMED
                  </span>
                ) : position.position_result === "won" ? (
                  <span className="px-3 py-1 text-sm font-header bg-green-500 text-white rounded-lg">
                    WON
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-header bg-accent-red-500 text-white rounded-lg">
                    LOST
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Position:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getPositionDetails()}
                  </span>
                </div>

                {!isResolved && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Value:</span>
                    <span className="text-sm font-header text-accent-red-500">
                      ${value.toFixed(2)}
                    </span>
                  </div>
                )}

                {isResolved && position.current_balance > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">To Win:</span>
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
          <div className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">
                    Market Volume
                  </div>
                  <div className="font-header text-xl text-accent-red-500">
                    ${position.market_data.volume}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Expiration</div>
                  <div className="font-header text-xl text-accent-red-500">
                    {new Date(
                      position.expiration_timestamp
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600">
                  {position.market_data.description}
                </div>
              </div>

              <div className="pt-2">
                {!isResolved ? (
                  <div className="text-center font-header text-blue-500 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    MARKET IS STILL ACTIVE
                  </div>
                ) : (
                  <div className="space-y-2">
                    {position.isRedeemed ? (
                      <div className="text-center font-header text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        POSITION HAS BEEN REDEEMED
                      </div>
                    ) : position.position_result === "won" ? (
                      canRedeem ? (
                        isRedeeming ? (
                          <button
                            disabled
                            className="w-full bg-accent-red-500 text-white py-4 px-6 rounded-lg font-header text-lg opacity-75"
                          >
                            <div className="flex items-center justify-center space-x-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                              <span>REDEEMING...</span>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={handleRedeemClick}
                            className="w-full bg-accent-red-500 hover:bg-accent-red-600 text-white py-4 px-6 rounded-lg font-header text-lg transition-colors duration-300"
                          >
                            REDEEM WINNINGS
                          </button>
                        )
                      ) : (
                        <div className="text-center font-header text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
                          NO BALANCE TO REDEEM
                        </div>
                      )
                    ) : (
                      <div className="text-center font-header text-accent-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
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
