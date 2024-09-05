import { useCallback } from "react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client, contract } from "@/app/client";
import { ethers, BigNumber } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

export const useFundBet = () => {
  const { emitEvent } = useWebSocket();
  const activeAccount = useActiveAccount();

  const handleFundBet = useCallback(
    async (
      betAddress: string,
      wagerWei: string,
      wagerCurrency: string,
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

        const wagerWeiBigNumber = BigNumber.from(wagerWei);

        // If wagerCurrency is not the zero address (ETH), we need to approve the token transfer first
        if (wagerCurrency !== ethers.constants.AddressZero) {
          const tokenContract = getContract({
            client,
            address: wagerCurrency,
            chain: contract.chain,
          });

          const approveTransaction = await prepareContractCall({
            contract: tokenContract,
            method: "function approve(address spender, uint256 amount)",
            params: [betAddress, wagerWeiBigNumber.toString()],
          });

          await sendTransaction({
            account: activeAccount,
            transaction: approveTransaction,
          });
        }

        // Prepare the fundBet transaction
        const fundBetTransaction = await prepareContractCall({
          contract: betContract,
          method: "function fundBet(uint256 amount)",
          params: [wagerWeiBigNumber.toString()],
          value:
            wagerCurrency === ethers.constants.AddressZero
              ? wagerWeiBigNumber.toString()
              : "0",
        });

        // Send the transaction
        const { transactionHash } = await sendTransaction({
          account: activeAccount,
          transaction: fundBetTransaction,
        });

        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const ethersBetContract = new ethers.Contract(
          betAddress,
          [
            "event BetFunded(address indexed betAddress, address indexed funder, uint256 amount, uint8 newStatus)",
          ],
          provider
        );

        const checkForEvent = async () => {
          const receipt = await provider.getTransactionReceipt(transactionHash);
          if (receipt) {
            const events = await ethersBetContract.queryFilter(
              ethersBetContract.filters.BetFunded(),
              receipt.blockNumber,
              receipt.blockNumber
            );
            if (events.length > 0) {
              const event = events[0];
              if (
                event.args &&
                "funder" in event.args &&
                "amount" in event.args
              ) {
                const amount = event.args.amount;
                const tokenSymbol =
                  wagerCurrency === ethers.constants.AddressZero
                    ? "ETH"
                    : "tokens";
                setMessage(
                  `Bet funded successfully! Amount: ${ethers.utils.formatEther(
                    amount
                  )} ${tokenSymbol}`
                );
                setIsAlertOpen(true);
                await fetchBetDetails(betAddress);
                emitEvent("betFunded", {
                  betAddress,
                  amount: wagerWeiBigNumber.toString(),
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
    [emitEvent, activeAccount]
  );

  return handleFundBet;
};
