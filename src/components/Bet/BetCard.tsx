// components/Bet/BetCard.tsx
"use client";

import React, { useState } from "react";
import { Collapse } from "@mui/material";
import ShareButton from "../Common/ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import QRCodeModal from "../Common/QRCodeModal";
import { BetDetailsType } from "@/components/types/bet";
import BetActions from "./BetActions";

interface BetCardProps {
  bet: BetDetailsType;
  ethToUsdRate: number;
  accountAddress: string;
  fetchBetDetails: () => void;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
}

const BetCard: React.FC<BetCardProps> = ({ bet, ethToUsdRate, accountAddress, fetchBetDetails, setMessage, setIsAlertOpen, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  return (
    <div className="mb-6">
      <div
        className={`p-6 bg-secondary text-font shadow-md cursor-pointer `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="text-2xl font-bold mb-4">{bet.conditions}</h4>
      </div>
      <Collapse in={isOpen}>
        <div className={`p-6 bg-secondary text-font shadow-md mt-4 rounded-lg`}>
          <div className="grid grid-cols-1 gap-4 mb-2">
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Bettor 1: {bet.better1Display.endsWith(".eth") ? bet.better1Display : shortenAddress(bet.better1Display)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Bettor 2: {bet.better2Display.endsWith(".eth") ? bet.better2Display : shortenAddress(bet.better2Display)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Decider: {bet.deciderDisplay.endsWith(".eth") ? bet.deciderDisplay : shortenAddress(bet.deciderDisplay)}
              </span>
            </div>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
            ${wagerInUsd} USD ({bet.wagerEth} ETH)
          </div>
          <BetActions
            betDetails={bet}
            fetchBetDetails={fetchBetDetails}
            setMessage={setMessage}
            setIsAlertOpen={setIsAlertOpen}
            isLoading={isLoading}
          />
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
