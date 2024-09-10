import React from "react";
import { BetDetailsType } from "@/components/types/bet";
import { getBetStatusText } from "@/utils/betUtils";
import { ethers } from "ethers";

interface BetInfoProps {
  betDetails: BetDetailsType;
  wagerInUsd: string;
}

const BetInfo: React.FC<BetInfoProps> = ({ betDetails, wagerInUsd }) => {
  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const wagerEth = ethers.utils.formatEther(betDetails.totalWager);

  return (
    <div className="p-4 mb-4 bg-secondary text-font shadow-md">
      <h4 className="text-xl font-bold mb-2 text-font">
        {betDetails.conditions}
      </h4>
      <div className="grid grid-cols-1 gap-4 mb-2">
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Maker:{" "}
            {betDetails.makerDisplay.endsWith(".eth")
              ? betDetails.makerDisplay
              : shortenAddress(betDetails.makerDisplay)}
          </span>
        </div>
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Taker:{" "}
            {betDetails.takerDisplay.endsWith(".eth")
              ? betDetails.takerDisplay
              : shortenAddress(betDetails.takerDisplay)}
          </span>
        </div>
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Judge:{" "}
            {betDetails.judgeDisplay.endsWith(".eth")
              ? betDetails.judgeDisplay
              : shortenAddress(betDetails.judgeDisplay)}
          </span>
        </div>
      </div>
      <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
        ${wagerInUsd} USD ({wagerEth} ETH)
      </div>
      <div className="mb-2 mt-2">
        <span className="inline-block px-4 py-2 bg-tertiary text-font">
          {getBetStatusText(betDetails.status)}
        </span>
      </div>
      {betDetails.status === 4 && betDetails.winnerDisplay && (
        <div className="p-4 bg-tertiary text-font shadow-md">
          <span>
            Winner:{" "}
            {betDetails.winnerDisplay.endsWith(".eth")
              ? betDetails.winnerDisplay
              : shortenAddress(betDetails.winnerDisplay)}
          </span>
        </div>
      )}
    </div>
  );
};

export default BetInfo;
