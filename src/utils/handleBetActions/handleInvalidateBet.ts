// utils/handleBetActions/handleInvalidateBet.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { invalidateBet } from "@/generated/bet";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import eventEmitter from "@/events/eventEmitter";
import debounce from "lodash/debounce";


const debouncedEmit = debounce(() => {
  eventEmitter.emit('refreshBets');
}, 1000, { leading: true, trailing: false });

export const handleInvalidateBet = async (
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

    const transaction = invalidateBet({
      contract: betContract,
    });

    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
    const startBlock = await provider.getBlockNumber();
    await sendTransaction(transaction);

    const ethersBetContract = new ethers.Contract(
      betAddress,
      ["event BetInvalidated()"],
      provider
    );

    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetInvalidated(),
        startBlock,
        currentBlock
      );

      if (events.length > 0) {
        setMessage("Bet invalidated successfully!");
        setIsAlertOpen(true);
        await fetchBetDetails(betAddress);
        debouncedEmit();
        return true;
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
    console.error("Error invalidating bet:", error);
    if (error instanceof Error) {
      setMessage(`Error invalidating bet. Please try again. Details: ${error.message}`);
    } else {
      setMessage("Error invalidating bet. Please try again. An unexpected error occurred.");
    }
    setIsAlertOpen(true);
  }
};
