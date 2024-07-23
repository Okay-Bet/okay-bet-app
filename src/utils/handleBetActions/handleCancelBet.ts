// utils/handleBetActions/handleCancelBet.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { cancelBet } from "@/generated/bet";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import { debouncedEmit } from "@/utils/sharedFunctions";

export const handleCancelBet = async (
  betAddress: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => Promise<any>,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
    const betContract = getContract({
      client,
      address: betAddress,
      chain: contract.chain,
    });
    const transaction = cancelBet({
      contract: betContract,
    });
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
    const startBlock = await provider.getBlockNumber();
    await sendTransaction(transaction);
    const ethersBetContract = new ethers.Contract(
      betAddress,
      ["event BetCancelled(address canceller)"],
      provider
    );
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetCancelled(),
        startBlock,
        currentBlock
      );
      if (events.length > 0) {
        const canceller = events[0].args?.[0]; 
        if (canceller) {
          setMessage(`Bet cancelled successfully by ${canceller}!`);
          setIsAlertOpen(true);
          await fetchBetDetails(betAddress);
          debouncedEmit(); 
          return true;
        }
      }
      return false;
    };
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (await checkForEvent()) {
        return;
      }
    }
    setMessage("Transaction sent, but event not found. Please check the transaction status.");
    setIsAlertOpen(true);
  } catch (error: unknown) {
    console.error("Error canceling bet:", error);
    if (error instanceof Error) {
      setMessage(`Error canceling bet. Please try again. Details: ${error.message}`);
    } else {
      setMessage("Error canceling bet. Please try again. An unexpected error occurred.");
    }
    setIsAlertOpen(true);
  }
};