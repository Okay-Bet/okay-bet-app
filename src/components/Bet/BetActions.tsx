import React, { useState } from "react";
import { BetDetailsType } from "@/components/types/bet";
import { useFundBet } from "@/hooks/useFundBet";
import { useResolveBet } from "@/hooks/useResolveBet";
import { useInvalidateBet } from "@/hooks/useInvalidateBet";
import { useCancelBet } from "@/hooks/useCancelBet";
import CircularProgress from "@mui/material/CircularProgress";
import useWebSocket from "@/hooks/useWebSocket";
import { BigNumber } from "ethers";
import { useActiveAccount } from "thirdweb/react";

interface BetActionsProps {
  betDetails: BetDetailsType;
  fetchBetDetails: (betAddress: string) => Promise<BetDetailsType | null>;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  accountAddress: string;
  canFund: boolean;
  userIsDecider: boolean;
  betStatusText: string;
  setLocalLoading: (isLoading: boolean) => void;
}

const BetActions: React.FC<BetActionsProps> = ({
  betDetails,
  fetchBetDetails,
  setMessage,
  setIsAlertOpen,
  isLoading,
  accountAddress,
  canFund,
  userIsDecider,
  betStatusText,
  setLocalLoading,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { emitEvent } = useWebSocket();
  const activeAccount = useActiveAccount();
  const userRoles = getUserRoles(accountAddress, betDetails);
  const availableActions = getAvailableActions(
    userRoles,
    betDetails.status,
    canFund
  );

  const handleFundBet = useFundBet();
  const handleInvalidateBet = useInvalidateBet();
  const handleResolveBet = useResolveBet();
  const handleCancelBet = useCancelBet();

  const handleAction = async (action: () => Promise<void>) => {
    if (!activeAccount) {
      setMessage("Please connect your wallet to perform this action.");
      setIsAlertOpen(true);
      return;
    }

    setIsActionLoading(true);
    setLocalLoading(true);
    try {
      await action();
    } finally {
      setIsActionLoading(false);
      setLocalLoading(false);
    }
  };

  const buttonClass = (color: string) => `
    w-full p-2 bg-${color}-500 text-font font-heading rounded-lg mt-2 
    ${
      isActionLoading || isLoading || !activeAccount
        ? "cursor-not-allowed opacity-50"
        : `hover:bg-tertiary hover:italic transition-colors`
    }
  `;

  const calculateWagerWei = (
    totalWager: string,
    wagerRatio: number,
    isMaker: boolean
  ): string => {
    const totalWagerBN = BigNumber.from(totalWager);
    const wagerWeiBN = isMaker
      ? totalWagerBN.mul(wagerRatio).div(100)
      : totalWagerBN.mul(100 - wagerRatio).div(100);
    return wagerWeiBN.toString();
  };

  return (
    <div>
      <div className="mb-2 mt-2">
        <span className="w-full inline-block py-2 break-words bg-tertiary text-font">
          {betStatusText}
        </span>
      </div>
      {availableActions.includes("fundBet") && canFund && (
        <button
          onClick={() => {
            const isMaker =
              accountAddress.toLowerCase() === betDetails.maker.toLowerCase();
            const wagerWei = calculateWagerWei(
              betDetails.totalWager,
              betDetails.wagerRatio,
              isMaker
            );
            handleAction(() =>
              handleFundBet(
                betDetails.address,
                wagerWei,
                betDetails.wagerCurrency,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
              )
            );
          }}
          className={buttonClass("green")}
          disabled={isActionLoading || isLoading}
        >
          {isActionLoading ? <CircularProgress size={24} /> : "Fund Bet"}
        </button>
      )}
      {!canFund && !userIsDecider && (
        <p className="text-font">You have already funded this bet.</p>
      )}
      {userIsDecider && (
        <p className="text-font">You are the decider for this bet.</p>
      )}
      {availableActions.includes("resolveBet") && (
        <>
          <button
            onClick={() =>
              handleAction(() =>
                handleResolveBet(
                  betDetails.address,
                  betDetails.maker,
                  fetchBetDetails,
                  setMessage,
                  setIsAlertOpen,
                  setIsActionLoading
                )
              )
            }
            className={buttonClass("blue")}
            disabled={isActionLoading || isLoading}
          >
            {isActionLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Declare Maker as Winner"
            )}
          </button>
          <button
            onClick={() =>
              handleAction(() =>
                handleResolveBet(
                  betDetails.address,
                  betDetails.taker,
                  fetchBetDetails,
                  setMessage,
                  setIsAlertOpen,
                  setIsActionLoading
                )
              )
            }
            className={buttonClass("blue")}
            disabled={isActionLoading || isLoading}
          >
            {isActionLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Declare Taker as Winner"
            )}
          </button>
        </>
      )}
      {availableActions.includes("invalidateBet") && (
        <button
          onClick={() =>
            handleAction(() =>
              handleInvalidateBet(
                betDetails.address,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
              )
            )
          }
          className={buttonClass("yellow")}
          disabled={isActionLoading || isLoading}
        >
          {isActionLoading ? <CircularProgress size={24} /> : "Invalidate Bet"}
        </button>
      )}
      {availableActions.includes("cancelBet") && (
        <button
          onClick={() =>
            handleAction(() =>
              handleCancelBet(
                betDetails.address,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
              )
            )
          }
          className={buttonClass("red")}
          disabled={isActionLoading || isLoading}
        >
          {isActionLoading ? <CircularProgress size={24} /> : "Cancel Bet"}
        </button>
      )}
    </div>
  );
};

export default BetActions;

const getUserRoles = (
  accountAddress: string,
  betDetails: BetDetailsType
): string[] => {
  const address = accountAddress.toLowerCase();
  const roles = [];

  if (address === betDetails.maker.toLowerCase()) roles.push("maker");
  if (address === betDetails.taker.toLowerCase()) roles.push("taker");
  if (address === betDetails.judge.toLowerCase()) roles.push("judge");

  return roles.length > 0 ? roles : ["other"];
};

const getAvailableActions = (
  userRoles: string[],
  betStatus: number,
  canFund: boolean
) => {
  const actions = new Set<string>();

  userRoles.forEach((role) => {
    if ((role === "maker" || role === "taker") && canFund) {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.add("fundBet");
      }
    }
    if (role === "maker" || role === "taker" || role === "judge") {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.add("cancelBet");
      }
    }
    if (role === "judge") {
      if (betStatus === 3) {
        actions.add("resolveBet");
        actions.add("invalidateBet");
      }
    }
  });
  return Array.from(actions);
};
