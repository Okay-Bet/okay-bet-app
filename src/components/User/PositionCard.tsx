import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PositionCardProps } from "../types";

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  value,
  onSell,
  onRedeem,
  sellLoading,
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

  const handleSellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking sell
    onSell(position.token_id, position.current_balance, isYesToken, value);
  };

  const handleRedeemClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking redeem
    onRedeem(position.token_id, isYesToken, position.condition_id, position.parent_collection_id);
  };

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
                onClick={handleSellClick}
                disabled={sellLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {sellLoading ? "Processing..." : "Sell Position"}
              </button>
            ) : (
              <button
                onClick={handleRedeemClick}
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

export default PositionCard;
