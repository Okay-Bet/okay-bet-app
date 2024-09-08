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
      wagerCurrency: string,
      fetchBetDetails: (betAddress: string) => Promise<any>,
      setMessage: (message: string) => void,
      setIsAlertOpen: (isOpen: boolean) => void,
      setIsActionLoading: (isLoading: boolean) => void
    ) => {
      try {
        console.log("handleFundBet called with:", {
          betAddress,
          wagerCurrency,
        });

        if (!activeAccount) {
          throw new Error(
            "No active account found. Please connect your wallet."
          );
        }
        console.log("Active account:", activeAccount.address);

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
        console.log("Fetching wager amount...");
        const wagerAmount = await betContract.getWagerAmount(
          activeAccount.address
        );
        console.log(
          "Wager amount:",
          ethers.utils.formatEther(wagerAmount),
          "ETH"
        );

        if (wagerAmount.isZero()) {
          throw new Error(
            "Wager amount is zero. The bet may not be properly initialized."
          );
        }

        // If wagerCurrency is not ETH, approve the token transfer
        if (wagerCurrency !== ethers.constants.AddressZero) {
          console.log("Preparing token approval...");
          const tokenContract = getContract({
            client,
            address: wagerCurrency,
            chain: contract.chain,
          });

          const approveTransaction = prepareContractCall({
            contract: tokenContract,
            method: "function approve(address spender, uint256 amount)",
            params: [betAddress, wagerAmount.toString()],
          });

          console.log("Sending approval transaction...");
          const approvalResult = await sendTransaction({
            account: activeAccount,
            transaction: approveTransaction,
          });
          console.log(
            "Token approval sent. Hash:",
            approvalResult.transactionHash
          );

          await provider.waitForTransaction(approvalResult.transactionHash);
          console.log("Token approval completed");
        }

        // Prepare the fundBet transaction
        console.log("Preparing fundBet transaction...");
        const fundBetTransaction = prepareContractCall({
          contract: getContract({
            client,
            address: betAddress,
            chain: contract.chain,
          }),
          method: "function fundBet()",
          params: [],
        });

        console.log("Sending fundBet transaction...");
        const { transactionHash } = await sendTransaction({
          account: activeAccount,
          transaction: {
            ...fundBetTransaction,
            value:
              wagerCurrency === ethers.constants.AddressZero
                ? wagerAmount.toString()
                : "0",
          },
        });
        console.log("fundBet transaction sent. Hash:", transactionHash);

        const checkForEvent = async () => {
          console.log("Checking for BetFunded event...");
          const receipt = await provider.getTransactionReceipt(transactionHash);
          if (receipt) {
            console.log("Transaction receipt found:", receipt);
            const events = await betContract.queryFilter(
              betContract.filters.BetFunded(),
              receipt.blockNumber,
              receipt.blockNumber
            );
            if (events.length > 0) {
              console.log("BetFunded event found:", events[0]);
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
                const message = `Bet funded successfully! Amount: ${ethers.utils.formatEther(
                  amount
                )} ${tokenSymbol}`;
                console.log(message);
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
          console.log(`Attempt ${i + 1} to find BetFunded event...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          if (await checkForEvent()) {
            return;
          }
        }

        console.log("BetFunded event not found after 30 attempts");
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
    [emitEvent, activeAccount]
  );

  return handleFundBet;
};
