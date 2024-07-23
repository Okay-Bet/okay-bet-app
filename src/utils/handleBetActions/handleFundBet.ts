// utils/handleBetActions/handleFundBet.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { fundBet } from "@/generated/bet";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import { BetStatus } from "@/utils/betStatusUtils";
import { debouncedEmit } from "@/utils/sharedFunctions";



export const handleFundBet = async (
  betAddress: string,
  wagerWei: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => Promise<any>,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
    console.log('Starting handleFundBet function');
    const betContract = getContract({
      client,
      address: betAddress,
      chain: contract.chain,
    });
    const transaction = fundBet({
      contract: betContract,
    });
    const wagerWeiBigInt = BigInt(wagerWei);
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
    const startBlock = await provider.getBlockNumber();
    await sendTransaction({ ...transaction, value: wagerWeiBigInt });
    const ethersBetContract = new ethers.Contract(
      betAddress,
      ["event BetFunded(address funder, uint256 amount)"],
      provider
    );
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetFunded(),
        startBlock,
        currentBlock
      );
      if (events.length > 0) {
        const [funder, amount] = events[0].args;
        setMessage(
          `Bet funded successfully! Funder: ${funder}, Amount: ${ethers.utils.formatEther(
            amount
          )} ETH`
        );
        setIsAlertOpen(true);
        const newBetDetails = await fetchBetDetails(betAddress);
        console.log('bet details', newBetDetails);
        debouncedEmit();
        return true;
      }
      return false;
    };
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (await checkForEvent()) {
        return;
      }
    }
    setMessage(
      "Transaction sent, but event not found. Please check the transaction status."
    );
    setIsAlertOpen(true);
  } catch (error: unknown) {
    console.error("Error funding bet:", error);
    if (error instanceof Error) {
      setMessage(
        `Error funding bet. Please try again. Details: ${error.message}`
      );
    } else {
      setMessage(
        "Error funding bet. Please try again. An unexpected error occurred."
      );
    }
    setIsAlertOpen(true);
  }
};