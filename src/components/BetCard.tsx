"use client";

import React, { useState } from "react";
import { Collapse } from "@mui/material";
import ShareButton from "./ShareButton"; 

interface BetCardProps {
  bet: any;
  ethToUsdRate: number;
  address: string;
}

const BetCard: React.FC<BetCardProps> = ({ bet, ethToUsdRate, address }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  let betCardClass = "bg-secondary";
  if (bet.status === 5) {
    betCardClass = "bg-gray-300 text-primary text-opacity-50";
  } else if (bet.status === 4) {
    if (bet.winner.toLowerCase() === address.toLowerCase()) {
      betCardClass = "bg-green-500";
    } else if (bet.better1.toLowerCase() === address.toLowerCase() || bet.better2.toLowerCase() === address.toLowerCase()) {
      betCardClass = "bg-red-500";
    }
  }

  return (
    <div className="mb-4">
      <div
        className={`p-4 ${betCardClass} text-font shadow-md cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="text-xl font-bold mb-2">{bet.conditions}</h4>
      </div>
      <Collapse in={isOpen}>
        <div className={`p-4 ${betCardClass} text-font shadow-md mt-2`}>
          <div className="flex justify-between mb-2">
            <span>
              Better 1:{" "}
              {bet.better1Display.endsWith(".eth")
                ? bet.better1Display
                : shortenAddress(bet.better1Display)}
            </span>
            <span>
              Better 2:{" "}
              {bet.better2Display.endsWith(".eth")
                ? bet.better2Display
                : shortenAddress(bet.better2Display)}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>
              Decider:{" "}
              {bet.deciderDisplay.endsWith(".eth")
                ? bet.deciderDisplay
                : shortenAddress(bet.deciderDisplay)}
            </span>
            <span>
              Wager: ${wagerInUsd} USD ({bet.wagerEth} ETH)
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Status: {bet.status === 4 ? "Resolved" : "Invalidated"}</span>
            <span>
              Winner:{" "}
              {bet.winnerDisplay
                ? bet.winnerDisplay.endsWith(".eth")
                  ? bet.winnerDisplay
                  : shortenAddress(bet.winnerDisplay)
                : "N/A"}
            </span>
          </div>
          <ShareButton 
            better1Display={bet.better1Display}
            better2Display={bet.better2Display}
            deciderDisplay={bet.deciderDisplay}
            wagerEth={bet.wagerEth}
            status={bet.status}
            conditions={bet.conditions}
            ethToUsdRate={ethToUsdRate}
          />
        </div>
      </Collapse>
    </div>
  );
};

export default BetCard;
