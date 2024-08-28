import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { cancelBet } from "@/generated/bet";
import useWebSocket from "@/hooks/useWebSocket";

export const handleCancelBet = async (
  betAddress: string,
  sendTransaction: any,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void,
  setIsActionLoading: (isLoading: boolean) => void
) => {
  const { emitEvent } = useWebSocket();

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

    // Emit WebSocket event instead of using event emitter
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
};