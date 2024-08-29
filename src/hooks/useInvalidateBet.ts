import { useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { invalidateBet } from "@/generated/bet";
import useWebSocket from "./useWebSocket";

export const useInvalidateBet = () => {
  const { emitEvent } = useWebSocket();

  const handleInvalidateBet = useCallback(
    async (
      betAddress: string,
      sendTransaction: any,
      fetchBetDetails: (betAddress: string) => Promise<any>,
      setMessage: (message: string) => void,
      setIsAlertOpen: (isOpen: boolean) => void,
      setIsActionLoading: (isLoading: boolean) => void
    ) => {
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const transaction = invalidateBet({
          contract: betContract,
        });

        setIsActionLoading(true);

        // Send the transaction
        const result = await sendTransaction(transaction);
        
        // Emit WebSocket event
        emitEvent("betInvalidated", { betAddress });

        setMessage(`Bet invalidation initiated for address: ${betAddress}. Waiting for confirmation...`);
        setIsAlertOpen(true);

        // Wait for transaction confirmation
        await result.wait();

        // Fetch updated bet details
        await fetchBetDetails(betAddress);

        setMessage(`Bet invalidated successfully for address: ${betAddress}`);
      } catch (error: unknown) {
        console.error("Error invalidating bet:", error);
        let errorMessage = "Error invalidating bet. Please try again. An unexpected error occurred.";
        if (error instanceof Error) {
          errorMessage = `Error invalidating bet. Please try again. Details: ${error.message}`;
        }
        setMessage(errorMessage);
        setIsAlertOpen(true);
      } finally {
        setIsActionLoading(false);
      }
    },
    [emitEvent]
  );

  return handleInvalidateBet;
};