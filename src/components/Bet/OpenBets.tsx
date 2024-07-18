// components/Bet/OpenBets.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Collapse } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import AlertModal from "../Common/AlertModal";
import ShareButton from "../ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import QRCodeModal from "../QRCodeModal";
import BetActions from "./BetActions";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";

interface OpenBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const OpenBets: React.FC<OpenBetsProps> = ({ betAddresses, accountAddress }) => {
  const { betDetails, fetchBetDetails, loading } = useFetchBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary font-bold">
      <h3
        className="text-lg italic mb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        Active Bets
      </h3>
      <Collapse in={isOpen}>
        {Array.isArray(betDetails) && betDetails.map((bet, index) => {
          const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

          return (
            <div key={index} className="p-6 mb-6 bg-secondary shadow-md">
              <h4 className="text-xl font-bold mb-4 text-font">
                {bet.conditions}
              </h4>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Bettor 1:{" "}
                    {bet.better1Display.endsWith(".eth")
                      ? bet.better1Display
                      : shortenAddress(bet.better1Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Bettor 2:{" "}
                    {bet.better2Display.endsWith(".eth")
                      ? bet.better2Display
                      : shortenAddress(bet.better2Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Decider:{" "}
                    {bet.deciderDisplay.endsWith(".eth")
                      ? bet.deciderDisplay
                      : shortenAddress(bet.deciderDisplay)}
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-full">
                  ${wagerInUsd} USD ({bet.wagerEth} ETH)
                </span>
              </div>
              {accountAddress.toLowerCase() === bet.decider.toLowerCase() ? (
                <BetActions
                  betDetails={bet}
                  fetchBetDetails={fetchBetDetails}
                  setMessage={setMessage}
                  setIsAlertOpen={setIsAlertOpen}
                  isLoading={loading}
                />
              ) : (
                <p className="text-font mb-4 mt-4 text-lg text-bold text-center italic">
                  Waiting for decider to pick a winner
                </p>
              )}
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
          );
        })}
      </Collapse>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          fetchBetDetails(); // Refresh bet details without a full page reload
        }}
      />
    </div>
  );
};

export default OpenBets;
