"use client";

import React, { useState } from "react";
import { Collapse } from "@mui/material";
import ShareButton from "./ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import QRCodeModal from "./QRCodeModal";

interface BetCardProps {
  bet: any;
  ethToUsdRate: number;
  address: string;
}

const BetCard: React.FC<BetCardProps> = ({ bet, ethToUsdRate, address }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;
  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  let betCardClass = "bg-secondary";
  if (bet.status === 5) {
    betCardClass = "bg-gray-300 text-primary text-opacity-50";
  } else if (bet.status === 4) {
    if (bet.winner.toLowerCase() === address.toLowerCase()) {
      betCardClass = "bg-green-500";
    } else if (
      bet.better1.toLowerCase() === address.toLowerCase() ||
      bet.better2.toLowerCase() === address.toLowerCase()
    ) {
      betCardClass = "bg-red-500";
    }
  }

  return (
    <div className="mb-6">
      <div
        className={`p-6 ${betCardClass} text-font shadow-md cursor-pointer `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="text-2xl font-bold mb-4">{bet.conditions}</h4>
      </div>
      <Collapse in={isOpen}>
        <div className={`p-6 ${betCardClass} text-font shadow-md mt-4 rounded-lg`}>
          <div className="flex justify-between mb-4">
            <div>
              <span className="block font-semibold">Bettor 1:</span>
              <span>
                {bet.better1Display.endsWith(".eth")
                  ? bet.better1Display
                  : shortenAddress(bet.better1Display)}
              </span>
            </div>
            <div>
              <span className="block font-semibold">Bettor 2:</span>
              <span>
                {bet.better2Display.endsWith(".eth")
                  ? bet.better2Display
                  : shortenAddress(bet.better2Display)}
              </span>
            </div>
          </div>
          <div className="flex justify-between mb-4">
            <div>
              <span className="block font-semibold">Judge:</span>
              <span>
                {bet.deciderDisplay.endsWith(".eth")
                  ? bet.deciderDisplay
                  : shortenAddress(bet.deciderDisplay)}
              </span>
            </div>
            <div>
              <span className="block font-semibold">Wager:</span>
              <span>
                ${wagerInUsd} USD ({bet.wagerEth} ETH)
              </span>
            </div>
          </div>
          <div className="flex justify-between mb-4">
            <div>
              <span className="block font-semibold">Status:</span>
              <span>
                {bet.status === 4 ? "Resolved" : "Invalidated"}
              </span>
            </div>
            <div>
              <span className="block font-semibold">Winner:</span>
              <span>
                {bet.winnerDisplay
                  ? bet.winnerDisplay.endsWith(".eth")
                    ? bet.winnerDisplay
                    : shortenAddress(bet.winnerDisplay)
                  : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex justify-end items-center space-x-4 mt-4">
            <ShareButton
              better1Display={bet.better1Display}
              better2Display={bet.better2Display}
              deciderDisplay={bet.deciderDisplay}
              wagerEth={bet.wagerEth}
              status={bet.status}
              conditions={bet.conditions}
              ethToUsdRate={ethToUsdRate}
              address={bet.address}
            />
            <QRCodeModal url={`https://www.okaybet.fun/bet/${bet.address}`} />
            <Link href={`/bet/${bet.address}`} passHref legacyBehavior>
              <a className="text-primary hover:text-quaternary cursor-pointer mt-1">
                <OpenInNewIcon />
              </a>
            </Link>
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default BetCard;
