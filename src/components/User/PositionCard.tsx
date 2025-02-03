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
    <div className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all duration-200">
      <div
        className="p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 leading-tight flex-1 pr-4">
                {position.market_data.question}
              </h3>
              {getStatusBadge()}
            </div>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Position:</span>
                <span className="text-sm font-medium text-gray-900">
                  {getPositionDetails()}
                </span>
              </div>
              
              {!isResolved && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Value:</span>
                  <span className="text-sm font-semibold text-blue-600">
                    ${value.toFixed(2)}
                  </span>
                </div>
              )}
              
              {isResolved && position.current_balance > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Balance:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatBalance(
                      position.current_balance,
                      position.market_data.collateral_token.decimals
                    )} USDC
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-gray-400 mt-1">
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
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Market Volume</div>
                <div className="font-medium text-gray-900">
                  ${position.market_data.volume}
                </div>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Expiration</div>
                <div className="font-medium text-gray-900">
                  {new Date(position.expiration_timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-lg">
              <div className="text-sm text-gray-600">
                {position.market_data.description}
              </div>
            </div>

            <div className="pt-2">
              {!isResolved ? (
                <div className="text-sm text-center text-gray-600 bg-blue-50 p-3.5 rounded-lg font-medium">
                  Market is still active
                </div>
              ) : (
                <div className="space-y-2">
                  {position.isRedeemed ? (
                    <div className="text-center font-medium bg-green-50 text-green-800 p-3.5 rounded-lg">
                      Position has been redeemed
                    </div>
                  ) : position.position_result === "won" ? (
                    canRedeem ? (
                      <button
                        onClick={handleRedeemClick}
                        className="w-full bg-green-600 text-white py-3.5 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 shadow-sm"
                      >
                        Redeem Winnings
                      </button>
                    ) : (
                      <div className="text-center text-gray-600 bg-gray-50 p-3.5 rounded-lg font-medium">
                        No balance to redeem
                      </div>
                    )
                  ) : (
                    <div className="text-center font-medium bg-red-50 text-red-800 p-3.5 rounded-lg">
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
