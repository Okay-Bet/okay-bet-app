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
  fetchBetDetails: (betAddress: string) => Promise<void>;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  sendTransactionProp?: any;
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
  sendTransactionProp,
  disableCollapse = false,
  initialOpen = false,
}) => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [localLoading, setLocalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { emitEvent } = useWebSocket();

  const actualSendTransaction = sendTransactionProp || sendTransaction;

  const userIsMaker = accountAddress.toLowerCase() === bet.maker.toLowerCase();
  const userIsTaker = accountAddress.toLowerCase() === bet.taker.toLowerCase();
  const userIsJudge = accountAddress.toLowerCase() === bet.judge.toLowerCase();

  const canFund =
    (userIsMaker || userIsTaker) && (bet.status === 0 || bet.status === 1);

  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  let bgColorClass = "bg-secondary";
  if (bet.status === 4) {
    bgColorClass = "bg-gray-600";
  } else if (
    bet.status === 3 &&
    bet.winner?.toLowerCase() === accountAddress.toLowerCase()
  ) {
    bgColorClass = "bg-green-600";
  }

  const getBetStatusText = () => {
    switch (bet.status) {
      case 0:
        return "Unfunded";
      case 1:
        return "Partially Funded";
      case 2:
        return "Funded";
      case 3:
        return "Resolved";
      case 4:
        return "Cancelled";
      default:
        return "Unknown Status";
    }
  };

  const displayParticipantInfo = (address: string, displayName: string) => {
    return (
      <Tooltip title={address} arrow placement="top">
        <span className="cursor-help break-all">{displayName}</span>
      </Tooltip>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBetDetails(bet.address);
    setIsRefreshing(false);
  };

  return (
    <div className="mb-6 relative">
      {(isRefreshing || isLoading) && (
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
              <span>
                Maker: {displayParticipantInfo(bet.maker, bet.makerDisplay)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>
                Taker: {displayParticipantInfo(bet.taker, bet.takerDisplay)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>
                Judge: {displayParticipantInfo(bet.judge, bet.judgeDisplay)}
              </span>
            </div>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
            ${wagerInUsd} USD ({bet.wagerEth} ETH)
          </div>
          <div className="mt-2">
            <span>Wager Ratio: {bet.wagerRatio}%</span>
          </div>
          <div className="mt-2">
            <span>Expiration Block: {bet.expirationBlock}</span>
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
              userIsDecider={userIsJudge}
              betStatusText={getBetStatusText()}
              setLocalLoading={setLocalLoading}
            />
          </div>
          <div className="flex justify-end items-center space-x-4 mt-4">
            {/* <ShareButton
              makerDisplay={bet.makerDisplay}
              takerDisplay={bet.takerDisplay}
              judgeDisplay={bet.judgeDisplay}
              wagerEth={bet.wagerEth}
              status={bet.status}
              conditions={bet.conditions}
              ethToUsdRate={ethToUsdRate}
              address={bet.address}
            /> */}
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
