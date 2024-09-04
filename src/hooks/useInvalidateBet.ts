import { useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { invalidateBet } from "@/generated/bet";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useInvalidateBet = () => {
  const { emitEvent } = useWebSocket();
  const account = useActiveAccount();

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
        setIsActionLoading(true);

        if (!account) {
          throw new Error("No active account found");
        }

        // Fetch current bet details
        const currentBetDetails = await fetchBetDetails(betAddress);

        // Check if the user is allowed to invalidate the bet
        const userAddress = account.address;
        if (
          userAddress.toLowerCase() !== currentBetDetails.maker.toLowerCase() &&
          userAddress.toLowerCase() !== currentBetDetails.taker.toLowerCase() &&
          userAddress.toLowerCase() !== currentBetDetails.judge.toLowerCase()
        ) {
          throw new Error("You don't have permission to invalidate this bet");
        }

        // Check bet status
        if (currentBetDetails.status === 3 || currentBetDetails.status === 4 || currentBetDetails.status === 5) {
          throw new Error("Bet cannot be invalidated as it is already resolved, invalidated, or expired");
        }

        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        // Prepare the transaction
        const transaction = invalidateBet({
          contract: betContract,
        });

        // Send the transaction
        const result = await sendTransaction(transaction);

        // Determine if this is a cancellation or invalidation
        const action = userAddress.toLowerCase() === currentBetDetails.judge.toLowerCase() ? "invalidated" : "cancelled";

        // Emit WebSocket event
        emitEvent(action === "invalidated" ? "betInvalidated" : "betCancelled", { betAddress });

        setMessage(`Bet ${action} initiated for address: ${betAddress}. Waiting for confirmation...`);
        setIsAlertOpen(true);

        // Wait for transaction confirmation
        await result.wait();

        // Fetch updated bet details
        await fetchBetDetails(betAddress);

        setMessage(`Bet ${action} successfully for address: ${betAddress}`);
      } catch (error: unknown) {
        console.error("Error invalidating/cancelling bet:", error);
        let errorMessage = "Error invalidating/cancelling bet. Please try again. An unexpected error occurred.";
        if (error instanceof Error) {
          errorMessage = `Error invalidating/cancelling bet. Please try again. Details: ${error.message}`;
        }
        setMessage(errorMessage);
        setIsAlertOpen(true);
      } finally {
        setIsActionLoading(false);
      }
    },
    [emitEvent, account?.address]
  );

  return handleInvalidateBet;
};