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

        console.log("Getting contract...");
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });
        console.log("Contract object:", betContract);

        // Get the wager amount from the contract
        console.log("Preparing getWagerAmount call...");
        const getWagerAmountTx = prepareContractCall({
          contract: betContract,
          method:
            "function getWagerAmount(address bettor) view returns (uint256)",
          params: [activeAccount.address],
        });
        console.log("getWagerAmount transaction prepared:", getWagerAmountTx);

        console.log("Calling getWagerAmount...");
        const getWagerAmountResult = await sendTransaction({
          account: activeAccount,
          transaction: getWagerAmountTx,
        });
        console.log("getWagerAmount transaction sent:", getWagerAmountResult);

        // Wait for the transaction to be mined
        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
        const receipt = await provider.waitForTransaction(
          getWagerAmountResult.transactionHash
        );
        console.log("getWagerAmount transaction mined:", receipt);

        // Decode the result
        const wagerAmountHex = receipt.logs[0].data;
        const wagerAmount = BigNumber.from(wagerAmountHex);
        console.log("Wager amount:", wagerAmount.toString());

        // If wagerCurrency is not the zero address (ETH), we need to approve the token transfer first
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
          await sendTransaction({
            account: activeAccount,
            transaction: approveTransaction,
          });
          console.log("Token approval completed");
        }

        // Prepare the fundBet transaction
        console.log("Preparing fundBet transaction...");
        const fundBetTransaction = prepareContractCall({
          contract: betContract,
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

        const ethersBetContract = new ethers.Contract(
          betAddress,
          [
            "event BetFunded(address indexed betAddress, address indexed funder, uint256 amount, uint8 newStatus)",
          ],
          provider
        );

        const checkForEvent = async () => {
          console.log("Checking for BetFunded event...");
          const receipt = await provider.getTransactionReceipt(transactionHash);
          if (receipt) {
            console.log("Transaction receipt found:", receipt);
            const events = await ethersBetContract.queryFilter(
              ethersBetContract.filters.BetFunded(),
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

        for (let i = 0; i < 15; i++) {
          console.log(`Attempt ${i + 1} to find BetFunded event...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (await checkForEvent()) {
            return;
          }
        }

        console.log("BetFunded event not found after 15 attempts");
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
