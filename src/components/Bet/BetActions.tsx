import React, { useState } from "react";
import { BetDetailsType } from "@/components/types/bet";
import { useFundBet } from "@/hooks/useFundBet";
import { useResolveBet } from "@/hooks/useResolveBet";
import { useInvalidateBet } from "@/hooks/useInvalidateBet";
import CircularProgress from "@mui/material/CircularProgress";
import useWebSocket from "@/hooks/useWebSocket";

interface BetActionsProps {
  betDetails: BetDetailsType;
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
  const { emitEvent } = useWebSocket();
  const userRoles = getUserRoles(accountAddress, betDetails);
  const availableActions = getAvailableActions(
    userRoles,
    betDetails.status,
    canFund
  );

  const handleFundBet = useFundBet();
  const handleInvalidateBet = useInvalidateBet();
  const handleResolveBet = useResolveBet();

  const fetchBetDetails = async (betAddress: string) => {
    emitEvent("requestBetUpdate", { betAddress });
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
            handleFundBet(
              betDetails.address,
              betDetails.wagerWei,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen,
              setIsActionLoading
            )
          }
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
              handleResolveBet(
                betDetails.address,
                betDetails.maker,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
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
              handleResolveBet(
                betDetails.address,
                betDetails.taker,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen,
                setIsActionLoading
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
            handleInvalidateBet(
              betDetails.address,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen,
              setIsActionLoading
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
        actions.add("invalidateBet");
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
