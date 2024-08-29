// components/Bet/BetActions.tsx
import React, { useState, useEffect } from "react";
import { BetDetailsType } from "@/components/types/bet";
import { useFundBet } from "@/hooks/useFundBet";
import { useCancelBet } from "@/hooks/useCancelBet";
import { useResolveBet } from "@/hooks/useResolveBet";
import { useInvalidateBet } from "@/hooks/useInvalidateBet";
import CircularProgress from "@mui/material/CircularProgress";

interface BetActionsProps {
  betDetails: BetDetailsType;
  fetchBetDetails: (betAddress: string) => Promise<BetDetailsType | null>;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  accountAddress: string;
  sendTransaction: any;
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
  sendTransaction,
  canFund,
  userIsDecider,
  betStatusText,
  setLocalLoading,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const userRoles = getUserRoles(accountAddress, betDetails);
  const availableActions = getAvailableActions(
    userRoles,
    betDetails.status,
    canFund
  );

  const handleCancelBet = useCancelBet();
  const handleFundBet = useFundBet();
  const handleInvalidateBet = useInvalidateBet();
  const handleResolveBet = useResolveBet();


  const handleAction = async (action: () => Promise<void>) => {
    setIsActionLoading(true);
    setLocalLoading(true);
    fetchBetDetails(betDetails.address);
    await action();
  };

  const buttonClass = (color: string) => `
    w-full p-2 bg-${color}-500 text-font font-heading rounded-lg mt-2 
    ${
      isActionLoading || isLoading
        ? "cursor-not-allowed opacity-50"
        : `hover:bg-tertiary hover:italic transition-colors`
    }
  `;

  return (
    <div>
      <div className="mb-2 mt-2">
        <span className="w-full inline-block py-2 break-words bg-tertiary text-font">
          {betStatusText}
        </span>
      </div>
      {availableActions.includes("fundBet") && canFund && (
        <button
          onClick={() =>
            handleAction(() =>
              handleFundBet(
                betDetails.address,
                betDetails.wagerWei,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
              )
            )
          }
          className={buttonClass("green")}
          disabled={isActionLoading || isLoading}
        >
          {isActionLoading ? <CircularProgress size={24} /> : "Fund Bet"}
        </button>
      )}
      {availableActions.includes("cancelBet") && (
        <button
          onClick={() =>
            handleAction(() =>
              handleCancelBet(
                betDetails.address,
                sendTransaction,
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
                  betDetails.better1,
                  sendTransaction,
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
                  betDetails.better2,
                  sendTransaction,
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
                sendTransaction,
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

  if (address === betDetails.better1.toLowerCase()) roles.push("better1");
  if (address === betDetails.better2.toLowerCase()) roles.push("better2");
  if (address === betDetails.decider.toLowerCase()) roles.push("decider");

  return roles.length > 0 ? roles : ["other"];
};

const getAvailableActions = (
  userRoles: string[],
  betStatus: number,
  canFund: boolean
) => {
  const actions = new Set<string>();

  userRoles.forEach((role) => {
    if ((role === "better1" || role === "better2") && canFund) {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.add("fundBet");
      }
    }
    if (role === "better1" || role === "better2" || role === "decider") {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.add("cancelBet");
      }
    }
    if (role === "decider") {
      if (betStatus === 3) {
        actions.add("resolveBet");
        actions.add("invalidateBet");
      }
    }
  });
  return Array.from(actions);
};
