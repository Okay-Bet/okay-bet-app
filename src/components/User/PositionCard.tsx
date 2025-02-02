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
    <div className="border rounded-lg bg-white mb-4 hover:shadow-md transition-all duration-200">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              <h3 className="font-medium text-gray-900">
                {position.market_data.question}
              </h3>
            </div>
            <div className="text-sm space-y-1">
              <div className="text-gray-600">
                Position:{" "}
                <span className="font-medium">{getPositionDetails()}</span>
              </div>
              {!isResolved && (
                <div className="text-gray-900 font-medium">
                  Value: ${value.toFixed(2)}
                </div>
              )}
              {isResolved && position.current_balance > 0 && (
                <div className="text-gray-900 font-medium">
                  Balance:{" "}
                  {formatBalance(
                    position.current_balance,
                    position.market_data.collateral_token.decimals
                  )}{" "}
                  USDC
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-400">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500">Market Volume</div>
                <div className="font-medium text-gray-900">
                  ${position.market_data.volume}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-500">Expiration</div>
                <div className="font-medium text-gray-900">
                  {new Date(position.expiration_timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p>{position.market_data.description}</p>
            </div>

            <div className="pt-2">
              {!isResolved ? (
                <div className="text-sm text-center text-gray-500 bg-gray-50 p-3 rounded">
                  Market is still active
                </div>
              ) : (
                <div className="space-y-2">
                  {position.isRedeemed ? (
                    <div className="text-center font-medium bg-green-50 text-green-800 p-3 rounded">
                      Position has been redeemed
                    </div>
                  ) : position.position_result === "won" ? (
                    canRedeem ? (
                      <button
                        onClick={handleRedeemClick}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors duration-200"
                      >
                        Redeem Winnings
                      </button>
                    ) : (
                      <div className="text-center text-gray-500 bg-gray-50 p-3 rounded">
                        No balance to redeem
                      </div>
                    )
                  ) : (
                    <div className="text-center font-medium bg-red-50 text-red-800 p-3 rounded">
                      Position lost
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionCard;
