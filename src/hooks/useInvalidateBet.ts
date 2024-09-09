import { useCallback } from "react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client, contract } from "@/app/client";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useInvalidateBet = () => {
  const { emitEvent } = useWebSocket();
  const activeAccount = useActiveAccount();

  const handleInvalidateBet = useCallback(
    async (
      betAddress: string,
      fetchBetDetails: (betAddress: string) => Promise<any>,
      setMessage: (message: string) => void,
      setIsAlertOpen: (isOpen: boolean) => void,
      setIsActionLoading: (isLoading: boolean) => void
    ) => {
      try {
        if (!activeAccount) {
          throw new Error(
            "No active account found. Please connect your wallet."
          );
        }

        emitEvent("refreshStart");
        setIsActionLoading(true);

        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        // Prepare the invalidateBet transaction
        const invalidateBetTransaction = await prepareContractCall({
          contract: betContract,
          method: "function invalidateBet()",
        });

        // Send the transaction
        const { transactionHash } = await sendTransaction({
          account: activeAccount,
          transaction: invalidateBetTransaction,
        });

        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const ethersBetContract = new ethers.Contract(
          betAddress,
          [
            "event BetInvalidated(address indexed betAddress, address indexed invalidator, string reason, uint64 invalidationTimestamp)",
          ],
          provider
        );

        const checkForEvent = async () => {
          const receipt = await provider.getTransactionReceipt(transactionHash);
          if (receipt) {
            const events = await ethersBetContract.queryFilter(
              ethersBetContract.filters.BetInvalidated(),
              receipt.blockNumber,
              receipt.blockNumber
            );
            if (events.length > 0) {
              const event = events[0];
              if (event.args && "invalidator" in event.args) {
                setMessage(
                  `Bet invalidated successfully!`
                );
                setIsAlertOpen(true);
                await fetchBetDetails(betAddress);
                emitEvent("betInvalidated", { betAddress });
                return true;
              }
            }
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
        console.error("Error invalidating bet:", error);
        if (error instanceof Error) {
          setMessage(
            `Error invalidating bet. Please try again. Details: ${error.message}`
          );
        } else {
          setMessage(
            "Error invalidating bet. Please try again. An unexpected error occurred."
          );
        }
        setIsAlertOpen(true);
      } finally {
        setIsActionLoading(false);
        emitEvent("refreshComplete");
      }
    },
    [emitEvent, activeAccount]
  );

  return handleInvalidateBet;
};
