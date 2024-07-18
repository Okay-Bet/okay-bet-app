// components/Bet/BetActions.tsx
import React from "react";
import { BetDetailsType } from "@/components/types/bet";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { handleFundBet, handleCancelBet, handleResolveBet, handleInvalidateBet } from "@/utils/handleBetActions";

interface BetActionsProps {
  betDetails: BetDetailsType;
  fetchBetDetails: () => void;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
}

const BetActions: React.FC<BetActionsProps> = ({ betDetails, fetchBetDetails, setMessage, setIsAlertOpen, isLoading }) => {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const userRole = getUserRole(account?.address || "", betDetails);
  const availableActions = getAvailableActions(userRole, betDetails.status);

  return (
    <div>
      {availableActions.includes("fundBet") && (
        <button
          onClick={() => handleFundBet(betDetails.address, betDetails.wagerWei, sendTransaction, fetchBetDetails, setMessage, setIsAlertOpen)}
          className="w-full p-2 bg-green-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Fund Bet
        </button>
      )}
      {availableActions.includes("cancelBet") && (
        <button
          onClick={() => handleCancelBet(betDetails.address, sendTransaction, fetchBetDetails, setMessage, setIsAlertOpen)}
          className="w-full p-2 mb-2 bg-red-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Cancel Bet
        </button>
      )}
      {availableActions.includes("resolveBet") && (
        <button
          onClick={() => handleResolveBet(betDetails.address, betDetails.winner!, sendTransaction, fetchBetDetails, setMessage, setIsAlertOpen)}
          className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading}
        >
          Resolve Bet
        </button>
      )}
      {availableActions.includes("invalidateBet") && (
        <button
          onClick={() => handleInvalidateBet(betDetails.address, sendTransaction, fetchBetDetails, setMessage, setIsAlertOpen)}
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

const getUserRole = (account: string | null, betDetails: BetDetailsType) => {
  if (!account) return "other";
  const address = account.toLowerCase();
  if (address === betDetails.better1.toLowerCase()) return "better1";
  if (address === betDetails.better2.toLowerCase()) return "better2";
  if (address === betDetails.decider.toLowerCase()) return "decider";
  return "other";
};

const getAvailableActions = (userRole: string, betStatus: number) => {
  const actions = [];
  if (userRole === "better1" || userRole === "better2") {
    if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
      actions.push("fundBet", "cancelBet");
    }
  } else if (userRole === "decider") {
    if (betStatus === 3) {
      actions.push("resolveBet", "invalidateBet");
    }
  }
  return actions;
};
