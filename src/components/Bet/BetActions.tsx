// components/Bet/BetActions.tsx
import React from "react";
import { BetDetailsType } from "@/components/types/bet";
import {
  handleFundBet,
  handleCancelBet,
  handleResolveBet,
  handleInvalidateBet,
} from "@/utils/handleBetActions";

interface BetActionsProps {
  betDetails: BetDetailsType;
  fetchBetDetails: (betAddress: string) => void;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  accountAddress: string;
  sendTransaction: any;
}

const BetActions: React.FC<BetActionsProps> = ({
  betDetails,
  fetchBetDetails,
  setMessage,
  setIsAlertOpen,
  isLoading,
  accountAddress,
  sendTransaction,
}) => {

  const userRoles = getUserRoles(accountAddress, betDetails);
  const availableActions = getAvailableActions(userRoles, betDetails.status);

  return (
    <div>
      {availableActions.includes("fundBet") && (
        <button
          onClick={() =>
            handleFundBet(
              betDetails.address,
              betDetails.wagerWei,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen
            )
          }
          className="w-full p-2 bg-green-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Fund Bet
        </button>
      )}
      {availableActions.includes("cancelBet") && (
        <button
          onClick={() =>
            handleCancelBet(
              betDetails.address,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen
            )
          }
          className="w-full p-2 mb-2 bg-red-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Cancel Bet
        </button>
      )}
      {availableActions.includes("resolveBet") && (
        <>
          <button
            onClick={() =>
              handleResolveBet(
                betDetails.address,
                betDetails.better1,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen
              )
            }
            className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            disabled={isLoading}
          >
            Declare Better 1 as Winner
          </button>
          <button
            onClick={() =>
              handleResolveBet(
                betDetails.address,
                betDetails.better2,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen
              )
            }
            className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            disabled={isLoading}
          >
            Declare Better 2 as Winner
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
              setIsAlertOpen
            )
          }
          className="w-full p-2 mb-2 bg-yellow-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Invalidate Bet
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

const getAvailableActions = (userRoles: string[], betStatus: number) => {
  const actions = new Set<string>();

  userRoles.forEach((role) => {
    if (role === "better1" || role === "better2") {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.add("fundBet");
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
