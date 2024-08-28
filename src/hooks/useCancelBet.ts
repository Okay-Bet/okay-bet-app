import { useCallback } from 'react';
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { cancelBet } from "@/generated/bet";
import useWebSocket from './useWebSocket';

export const useCancelBet = () => {
  const { emitEvent } = useWebSocket();

  const handleCancelBet = useCallback(async (
    betAddress: string,
    sendTransaction: any,
    setMessage: (message: string) => void,
    setIsAlertOpen: (isOpen: boolean) => void,
    setIsActionLoading: (isLoading: boolean) => void
  ) => {
    try {
      setIsActionLoading(true);
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });
      const transaction = cancelBet({
        contract: betContract,
      });

      await sendTransaction(transaction);

      // Emit WebSocket event
      emitEvent('betCancelled', { betAddress });

      setMessage(`Bet cancellation initiated. Waiting for confirmation...`);
      setIsAlertOpen(true);
    } catch (error: unknown) {
      console.error("Error canceling bet:", error);
      if (error instanceof Error) {
        setMessage(`Error canceling bet. Please try again. Details: ${error.message}`);
      } else {
        setMessage("Error canceling bet. Please try again. An unexpected error occurred.");
      }
      setIsAlertOpen(true);
      setIsActionLoading(false);
    }
  }, [emitEvent]);

  return handleCancelBet;
};