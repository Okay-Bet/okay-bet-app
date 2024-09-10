import { useCallback } from "react";
import { useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client, contract } from "@/app/client";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

export const useFundBet = () => {
  const { emitEvent } = useWebSocket();
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  const retryTransaction = async (transactionFunc: () => Promise<any>) => {
    let lastError;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        return await transactionFunc();
      } catch (error) {
        console.error(`Transaction attempt ${i + 1} failed:`, error);
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw lastError;
  };

  const handleFundBet = useCallback(
    async (
      betAddress: string,
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

        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const betContract = new ethers.Contract(
          betAddress,
          [
            "function getWagerAmount(address bettor) view returns (uint256)",
            "function fundBet()",
            "event BetFunded(address indexed betAddress, address indexed funder, uint256 amount, uint8 newStatus)",
          ],
          provider
        );

        // Get the wager amount using ethers.js
        const wagerAmount = await betContract.getWagerAmount(
          activeAccount.address
        );

        if (wagerAmount.isZero()) {
          throw new Error(
            "Wager amount is zero. The bet may not be properly initialized."
          );
        }

        const isERC20 = wagerCurrency !== ethers.constants.AddressZero;

        if (isERC20) {
          // Approve USDC transfer
          const usdcContract = getContract({
            client,
            address: wagerCurrency,
            chain: contract.chain,
          });

          const approveTransaction = prepareContractCall({
            contract: usdcContract,
            method: "function approve(address spender, uint256 amount)",
            params: [betAddress, wagerAmount.toString()],
          });

          await retryTransaction(
            () =>
              new Promise((resolve, reject) => {
                sendTransaction(approveTransaction, {
                  onSuccess: (result) => resolve(result),
                  onError: (error) => reject(error),
                });
              })
          );
        }

        // Prepare the fundBet transaction
        const fundBetTransaction = prepareContractCall({
          contract: getContract({
            client,
            address: betAddress,
            chain: contract.chain,
          }),
          method: "function fundBet()",
          params: [],
        });

        let transactionHash: string;
        await retryTransaction(
          () =>
            new Promise((resolve, reject) => {
              sendTransaction(
                {
                  ...fundBetTransaction,
                  value: isERC20 ? "0" : wagerAmount.toString(),
                },
                {
                  onSuccess: (result) => {
                    transactionHash = result.transactionHash;
                    resolve(result);
                  },
                  onError: (error) => reject(error),
                }
              );
            })
        );

        const checkForEvent = async () => {
          const receipt = await provider.getTransactionReceipt(
            transactionHash!
          );
          if (receipt) {
            const events = await betContract.queryFilter(
              betContract.filters.BetFunded(),
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
                const tokenSymbol = isERC20 ? "USDC" : "ETH";
                const formattedAmount = isERC20
                  ? ethers.utils.formatUnits(amount, 6)
                  : ethers.utils.formatEther(amount);
                const message = `Bet funded successfully with ${formattedAmount} ${tokenSymbol}!`;
                setMessage(message);
                setIsAlertOpen(true);
                await fetchBetDetails(betAddress);
                emitEvent("betFunded", {
                  betAddress,
                  amount: amount.toString(),
                });
                return true;
              }
            }
          }
          return false;
        };

        for (let i = 0; i < 30; i++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          if (await checkForEvent()) {
            return;
          }
        }

        setMessage(
          "Transaction sent, but funding confirmation not received. Please check the transaction status manually."
        );
        setIsAlertOpen(true);
      } catch (error: unknown) {
        console.error("Error funding bet:", error);
        if (error instanceof Error) {
          setMessage(
            `Error funding bet: ${error.message}. Please check the transaction status manually.`
          );
        } else {
          setMessage(
            "An unexpected error occurred while funding the bet. Please check the transaction status manually."
          );
        }
        setIsAlertOpen(true);
      } finally {
        setIsActionLoading(false);
        emitEvent("refreshComplete");
      }
    },
    [emitEvent, activeAccount, sendTransaction]
  );

  return handleFundBet;
};
