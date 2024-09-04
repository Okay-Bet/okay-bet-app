// hooks/useResolveBet.ts
import { useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { resolveBet } from "@/generated/bet";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useResolveBet = () => {
  const { emitEvent } = useWebSocket();
  const account = useActiveAccount();

  const handleResolveBet = useCallback(
    async (
      betAddress: string,
      winnerAddress: string,
      sendTransaction: any,
      fetchBetDetails: (betAddress: string) => Promise<any>,
      setMessage: (message: string) => void,
      setIsAlertOpen: (isOpen: boolean) => void,
      setIsActionLoading: (isLoading: boolean) => void
    ) => {
      try {
        emitEvent("refreshStart");
        setIsActionLoading(true);

        if (!account) {
          throw new Error("No active account found");
        }

        // Fetch current bet details
        const currentBetDetails = await fetchBetDetails(betAddress);

        // Check if the user is the judge
        if (account.address.toLowerCase() !== currentBetDetails.judge.toLowerCase()) {
          throw new Error("Only the judge can resolve this bet");
        }

        // Check bet status
        if (currentBetDetails.status !== 2) { // Assuming 2 is the status for FullyFunded
          throw new Error("Bet can only be resolved when it is fully funded");
        }

        // Check if the winner is either the maker or the taker
        if (winnerAddress.toLowerCase() !== currentBetDetails.maker.toLowerCase() &&
            winnerAddress.toLowerCase() !== currentBetDetails.taker.toLowerCase()) {
          throw new Error("Winner must be either the maker or the taker of the bet");
        }

        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const formattedWinnerAddress = ethers.utils.getAddress(
          winnerAddress
        ) as `0x${string}`;

        const transaction = resolveBet({
          contract: betContract,
          winner: formattedWinnerAddress,
        });

        console.log("Bet Address:", betAddress);
        console.log("Winner Address:", formattedWinnerAddress);

        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const startBlock = await provider.getBlockNumber();

        await sendTransaction(transaction);

        const ethersBetContract = new ethers.Contract(
          betAddress,
          ["event BetResolved(address indexed betAddress, address indexed winner, uint256 winningAmount, uint64 resolutionTimestamp)"],
          provider
        );

        const checkForEvent = async () => {
          const currentBlock = await provider.getBlockNumber();
          const events = await ethersBetContract.queryFilter(
            ethersBetContract.filters.BetResolved(),
            startBlock,
            currentBlock
          );
          if (events.length > 0) {
            const event = events[0];
            if (event.args && "winner" in event.args && "winningAmount" in event.args) {
              const winner = event.args.winner;
              const winningAmount = event.args.winningAmount;
              setMessage(`Bet resolved successfully! Winner: ${winner}. Winning amount: ${ethers.utils.formatEther(winningAmount)} ETH`);
              setIsAlertOpen(true);
              await fetchBetDetails(betAddress);
              emitEvent("betResolved", { betAddress, winner, winningAmount: winningAmount.toString() });
              setIsActionLoading(false);
              return true;
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
          console.error("Error details:", error);
          setMessage(
            `Error resolving bet. Please try again. Details: ${error.message}`
          );
        } else {
          console.error("Unexpected error:", error);
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
    [emitEvent, account?.address]
  );

  return handleResolveBet;
};