// components/Bet/BetCard.tsx
"use client";

import React, { useState } from "react";
import { Collapse, Tooltip } from "@mui/material";
import { useSendTransaction } from "thirdweb/react";
import ShareButton from "../Common/ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import QRCodeModal from "../Common/QRCodeModal";
import { BetDetailsType } from "@/components/types/bet";
import BetActions from "./BetActions";
import CircularProgress from "@mui/material/CircularProgress";
import useWebSocket from "@/hooks/useWebSocket";

interface BetCardProps {
  bet: BetDetailsType;
  ethToUsdRate: number;
  accountAddress: string;
  fetchBetDetails?: (betAddress: string) => Promise<BetDetailsType | null>;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  sendTransactionProp?: any; // Make this prop optional
  disableCollapse?: boolean;
  initialOpen?: boolean;
}

const BetCard: React.FC<BetCardProps> = ({
  bet,
  ethToUsdRate,
  accountAddress,
  fetchBetDetails,
  setMessage,
  setIsAlertOpen,
  isLoading,
  sendTransactionProp, // This is now optional
  disableCollapse = false,
  initialOpen = false
}) => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [localLoading, setLocalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { emitEvent } = useWebSocket();

  // Use sendTransactionProp if provided, otherwise use the hook
  const actualSendTransaction = sendTransactionProp || sendTransaction;

  const userIsBetter1 =
    accountAddress.toLowerCase() === bet.better1.toLowerCase();
  const userIsBetter2 =
    accountAddress.toLowerCase() === bet.better2.toLowerCase();
  const userIsDecider =
    accountAddress.toLowerCase() === bet.decider.toLowerCase();
  const canFund =
    (userIsBetter1 && bet.status !== 1) || (userIsBetter2 && bet.status !== 2);

  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  let bgColorClass = "bg-secondary";
  if (bet.status === 5) {
    bgColorClass = "bg-gray-600";
  } else if (
    bet.status === 4 &&
    bet.winner?.toLowerCase() === accountAddress.toLowerCase()
  ) {
    bgColorClass = "bg-green-600";
  }

  const getBetStatusText = () => {
    switch (bet.status) {
      case 0:
        return "Unfunded";
      case 1:
        return `Partially Funded (${bet.better1Display} has funded)`;
      case 2:
        return `Partially Funded (${bet.better2Display} has funded)`;
      case 3:
        return "Waiting on Judge to pick winner";
      case 4:
        return "Resolved";
      case 5:
        return "Cancelled";
      case 6:
        return "Cancelled";
      default:
        return "Pending Status";
    }
  };

  const displayParticipantInfo = (address: string, displayName: string) => {
    return (
      <Tooltip title={address} arrow placement="top">
        <span className="cursor-help break-all">{displayName}</span>
      </Tooltip>
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    emitEvent('requestBetUpdate', { betAddress: bet.address });
    // You might want to add a timeout to set isRefreshing back to false
    // in case the update event is not received
    setTimeout(() => setIsRefreshing(false), 5000);
  };

  return (
    <div className="mb-6 relative">
      {isRefreshing && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-10">
          <CircularProgress />
        </div>
      )}
      <div
        className={`p-6 ${bgColorClass} text-font cursor-pointer`}
        onClick={() => !disableCollapse && setIsOpen(!isOpen)}
      >
        <h4 className="text-2xl font-bold break-words">{bet.conditions}</h4>
      </div>
      <Collapse in={isOpen}>
        <div className={`p-6 ${bgColorClass} text-font`}>
          <div className="grid grid-cols-1 gap-4 mb-2">
            <div className="p-4 bg-tertiary text-font">
              <span>Maker: {displayParticipantInfo(bet.better1, bet.better1Display)}</span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>Taker: {displayParticipantInfo(bet.better2, bet.better2Display)}</span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>Judge: {displayParticipantInfo(bet.decider, bet.deciderDisplay)}</span>
            </div>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
            ${wagerInUsd} USD ({bet.wagerEth} ETH)
          </div>
          <div className="justify-end items-center mt-4">
            <BetActions
              betDetails={bet}
              setMessage={setMessage}
              setIsAlertOpen={setIsAlertOpen}
              isLoading={localLoading}
              accountAddress={accountAddress}
              sendTransaction={actualSendTransaction}
              canFund={canFund}
              userIsDecider={userIsDecider}
              betStatusText={getBetStatusText()}
              setLocalLoading={setLocalLoading}
            />
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