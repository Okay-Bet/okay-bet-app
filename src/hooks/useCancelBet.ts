import { useCallback } from "react";
import { getContract } from "thirdweb";
import { contract } from "@/app/client";
import { cancelBet } from "@/generated/bet";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useCancelBet = () => {
  const { emitEvent } = useWebSocket();
  const account = useActiveAccount();

  const handleCancelBet = useCallback(
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

        console.log("Active account:", account);

        // Fetch current bet details
        const currentBetDetails = await fetchBetDetails(betAddress);
        console.log("Current bet details:", JSON.stringify(currentBetDetails, null, 2));

        // Check if the user is allowed to cancel the bet
        const userAddress = account.address;
        console.log("User address:", userAddress);
        console.log("Better1:", currentBetDetails.better1);
        console.log("Better2:", currentBetDetails.better2);
        console.log("Decider:", currentBetDetails.decider);

        if (
          userAddress.toLowerCase() !== currentBetDetails.better1.toLowerCase() &&
          userAddress.toLowerCase() !== currentBetDetails.better2.toLowerCase() &&
          userAddress.toLowerCase() !== currentBetDetails.decider.toLowerCase()
        ) {
          throw new Error("You don't have permission to cancel this bet");
        }

        // Check bet status
        console.log("Bet status:", currentBetDetails.status);
        if (currentBetDetails.status === 4 || currentBetDetails.status === 5) {
          throw new Error(
            "Bet cannot be cancelled as it is already resolved or invalidated"
          );
        }

        const betContract = getContract({
          address: betAddress,
          chain: contract.chain
        });

        // Prepare the transaction
        const transaction = await cancelBet({ contract: betContract });
        console.log("Prepared transaction:", JSON.stringify(transaction, null, 2));

        // Send the transaction
        console.log("About to send transaction. sendTransaction function:", sendTransaction);
        try {
          const result = await sendTransaction(transaction);
          console.log("Transaction result:", JSON.stringify(result, null, 2));

          // Emit WebSocket event
          emitEvent("betCancelled", { betAddress });

          setMessage(
            `Bet cancellation initiated for address: ${betAddress}. Waiting for confirmation...`
          );
          setIsAlertOpen(true);

          // Wait for transaction confirmation
          console.log("Waiting for transaction confirmation...");
          const receipt = await result.wait();
          console.log("Transaction receipt:", JSON.stringify(receipt, null, 2));

          // Fetch updated bet details
          const updatedBetDetails = await fetchBetDetails(betAddress);
          console.log("Updated bet details:", JSON.stringify(updatedBetDetails, null, 2));

          setMessage(`Bet cancelled successfully for address: ${betAddress}`);
        } catch (txError) {
          console.error("Error sending transaction:", txError);
          throw txError;
        }
      } catch (error: unknown) {
        console.error("Error canceling bet:", error);
        let errorMessage =
          "Error canceling bet. Please try again. An unexpected error occurred.";
        if (error instanceof Error) {
          errorMessage = `Error canceling bet. Please try again. Details: ${error.message}`;
          console.error("Error stack:", error.stack);
        }
        if (typeof error === "object" && error !== null) {
          console.error("Full error object:", JSON.stringify(error, null, 2));
        }
        setMessage(errorMessage);
        setIsAlertOpen(true);
      } finally {
        setIsActionLoading(false);
      }
    },
    [emitEvent, account?.address]
  );

  return handleCancelBet;
};
