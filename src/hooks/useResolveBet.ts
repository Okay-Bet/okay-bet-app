import { useCallback } from "react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client, contract } from "@/app/client";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useResolveBet = () => {
  const { emitEvent } = useWebSocket();
  const activeAccount = useActiveAccount();

  const handleResolveBet = useCallback(
    async (
      betAddress: string,
      winnerAddress: string,
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

        const formattedWinnerAddress = ethers.utils.getAddress(
          winnerAddress
        ) as `0x${string}`;

        // Prepare the resolveBet transaction
        const resolveBetTransaction = await prepareContractCall({
          contract: betContract,
          method: "function resolveBet(address winner)",
          params: [formattedWinnerAddress],
        });

        // Send the transaction
        const { transactionHash } = await sendTransaction({
          account: activeAccount,
          transaction: resolveBetTransaction,
        });

        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const ethersBetContract = new ethers.Contract(
          betAddress,
          [
            "event BetResolved(address indexed betAddress, address indexed winner, uint256 winningAmount, uint64 resolutionTimestamp)",
          ],
          provider
        );

        const checkForEvent = async () => {
          const receipt = await provider.getTransactionReceipt(transactionHash);
          if (receipt) {
            const events = await ethersBetContract.queryFilter(
              ethersBetContract.filters.BetResolved(),
              receipt.blockNumber,
              receipt.blockNumber
            );
            if (events.length > 0) {
              const event = events[0];
              if (
                event.args &&
                "winner" in event.args &&
                "winningAmount" in event.args
              ) {
                const winner = event.args.winner;
                const winningAmount = event.args.winningAmount;
                setMessage(
                  `Bet resolved successfully!`
                );
                setIsAlertOpen(true);
                await fetchBetDetails(betAddress);
                emitEvent("betResolved", {
                  betAddress,
                  winner,
                  winningAmount: winningAmount.toString(),
                });
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
        console.error("Error resolving bet:", error);
        if (error instanceof Error) {
          setMessage(
            `Error resolving bet. Please try again. Details: ${error.message}`
          );
        } else {
          setMessage(
            "Error resolving bet. Please try again. An unexpected error occurred."
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

  return handleResolveBet;
};