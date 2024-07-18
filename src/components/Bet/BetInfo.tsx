// components/Bet/BetInfo.tsx
import React from "react";
import { BetDetailsType } from "@/hooks/useFetchBetDetails";
import { getBetStatusText } from "@/utils/betUtils";

interface BetInfoProps {
  betDetails: BetDetailsType;
  wagerInUsd: string;
}

const BetInfo: React.FC<BetInfoProps> = ({ betDetails, wagerInUsd }) => {
  return (
    <div className="p-4 mb-4 bg-secondary text-font shadow-md">
      <h4 className="text-xl font-bold mb-2 text-font">
        {betDetails.conditions}
      </h4>
      <div className="grid grid-cols-1 gap-4 mb-2">
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Better 1:{" "}
            {betDetails.better1Display.endsWith(".eth")
              ? betDetails.better1Display
              : `${betDetails.better1Display.slice(0, 6)}...${betDetails.better1Display.slice(-4)}`}
          </span>
        </div>
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Better 2:{" "}
            {betDetails.better2Display.endsWith(".eth")
              ? betDetails.better2Display
              : `${betDetails.better2Display.slice(0, 6)}...${betDetails.better2Display.slice(-4)}`}
          </span>
        </div>
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Decider:{" "}
            {betDetails.deciderDisplay.endsWith(".eth")
              ? betDetails.deciderDisplay
              : `${betDetails.deciderDisplay.slice(0, 6)}...${betDetails.deciderDisplay.slice(-4)}`}
          </span>
        </div>
      </div>
      <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
        ${wagerInUsd} USD ({betDetails.wagerEth} ETH)
      </div>
      <div className="mb-2 mt-2">
        <span className="inline-block px-4 py-2 bg-tertiary text-font">
          {getBetStatusText(betDetails.status)}
        </span>
      </div>
      {betDetails.status === 4 && (
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Winner:{" "}
            {betDetails.winnerDisplay.endsWith(".eth")
              ? betDetails.winnerDisplay
              : `${betDetails.winnerDisplay.slice(0, 6)}...${betDetails.winnerDisplay.slice(-4)}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default BetInfo;
