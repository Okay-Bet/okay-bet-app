import { useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { fundBet } from "@/generated/bet";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";

export const useFundBet = () => {
  const { emitEvent } = useWebSocket();

  const handleFundBet = useCallback(
    async (
      betAddress: string,
      wagerWei: string,
      sendTransaction: any,
      fetchBetDetails: (betAddress: string) => Promise<any>,
      setMessage: (message: string) => void,
      setIsAlertOpen: (isOpen: boolean) => void,
      setIsActionLoading: (isLoading: boolean) => void
    ) => {
      try {
        emitEvent("refreshStart");
        setIsActionLoading(true);

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
            const event = events[0];
            if (event.args && "funder" in event.args && "amount" in event.args) {
              const amount = event.args.amount;
              setMessage(
                `Bet funded successfully! Amount: ${ethers.utils.formatEther(
                  amount
                )} ETH`
              );
              setIsAlertOpen(true);
              await fetchBetDetails(betAddress);
              emitEvent("betFunded", { betAddress, amount: wagerWeiBigInt.toString() });              setIsActionLoading(false);
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
      } finally {
        setIsActionLoading(false);
        emitEvent("refreshComplete");
      }
    },
    [emitEvent]
  );

  return handleFundBet;
};