import React, { useState } from "react";
import { BetDetailsType } from "@/components/types/bet";
import {
  handleFundBet,
  handleCancelBet,
  handleResolveBet,
  handleInvalidateBet,
} from "@/utils/handleBetActions";
import CircularProgress from "@mui/material/CircularProgress";
import ContractEventListener from "../Common/ContractEventListener";

interface BetActionsProps {
  betDetails: BetDetailsType;
  fetchBetDetails: (betAddress: string) => void;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  accountAddress: string;
  sendTransaction: any;
  canFund: boolean;
  userIsDecider: boolean;
  betStatusText: string;
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
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [listenForEvents, setListenForEvents] = useState(false);

  const handleEvent = (events: any) => {
    console.log("Event received:", events);
    fetchBetDetails(betDetails.address);
    setLocalLoading(false);
    setListenForEvents(false); // Disable the event listener after receiving an event
  };

  const userRoles = getUserRoles(accountAddress, betDetails);
  const availableActions = getAvailableActions(
    userRoles,
    betDetails.status,
    canFund
  );

  const triggerAction = async (action: () => Promise<void>) => {
    setLocalLoading(true);
    setListenForEvents(true);
    await action();
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
          onClick={() => triggerAction(() =>
            handleFundBet(
              betDetails.address,
              betDetails.wagerWei,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen
            )
          )}
          className="w-full p-2 bg-green-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading || localLoading}
        >
          {isLoading || localLoading ? <CircularProgress size={24} /> : "Fund Bet"}
        </button>
      )}
      {availableActions.includes("cancelBet") && (
        <button
          onClick={() => triggerAction(() =>
            handleCancelBet(
              betDetails.address,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen
            )
          )}
          className="w-full p-2 mb-2 bg-red-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading || localLoading}
        >
          {isLoading || localLoading ? <CircularProgress size={24} /> : "Cancel Bet"}
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
            onClick={() => triggerAction(() =>
              handleResolveBet(
                betDetails.address,
                betDetails.better1,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen
              )
            )}
            className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            disabled={isLoading || localLoading}
          >
            Declare Better 1 as Winner
          </button>
          <button
            onClick={() => triggerAction(() =>
              handleResolveBet(
                betDetails.address,
                betDetails.better2,
                sendTransaction,
                fetchBetDetails,
                setMessage,
                setIsAlertOpen
              )
            )}
            className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            disabled={isLoading || localLoading}
          >
            Declare Better 2 as Winner
          </button>
        </>
      )}
      {availableActions.includes("invalidateBet") && (
        <button
          onClick={() => triggerAction(() =>
            handleInvalidateBet(
              betDetails.address,
              sendTransaction,
              fetchBetDetails,
              setMessage,
              setIsAlertOpen
            )
          )}
          className="w-full p-2 mb-2 bg-yellow-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
          disabled={isLoading || localLoading}
        >
          Invalidate Bet
        </button>
      )}

      {listenForEvents && (
        <>
          <ContractEventListener
            contractAddress={betDetails.address}
            eventName="BetFunded"
            onEvent={handleEvent}
          />
          <ContractEventListener
            contractAddress={betDetails.address}
            eventName="BetCancelled"
            onEvent={handleEvent}
          />
          <ContractEventListener
            contractAddress={betDetails.address}
            eventName="BetResolved"
            onEvent={handleEvent}
          />
        </>
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

const getAvailableActions = (userRoles: string[], betStatus: number, canFund: boolean) => {
  const actions = new Set<string>();

  userRoles.forEach(role => {
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
