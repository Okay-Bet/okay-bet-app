import { useCallback } from "react";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import useWebSocket from "./useWebSocket";
import { useActiveAccount } from "thirdweb/react";
import betABI from "@/constants/betABI.json";

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

        // Create provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        console.log("Creating contract instance for address:", betAddress);
        const betContract = new ethers.Contract(betAddress, betABI, signer);
        console.log("BetContract created");

        // Get the required wager amount for the current user
        console.log(
          "Attempting to get wager amount for address:",
          activeAccount.address
        );
        let wagerAmount;
        try {
          wagerAmount = await betContract.getWagerAmount(activeAccount.address);
          console.log("Wager amount:", wagerAmount.toString());
        } catch (error) {
          console.error("Error calling getWagerAmount:", error);
          throw error;
        }

        // If wagerCurrency is not the zero address (ETH), we need to approve the token transfer first
        if (wagerCurrency !== ethers.constants.AddressZero) {
          console.log("Wager currency is not ETH, preparing approval");
          const tokenContract = new ethers.Contract(
            wagerCurrency,
            [
              "function approve(address spender, uint256 amount) public returns (bool)",
            ],
            signer
          );
          console.log("Token contract created");

          console.log("Preparing approve transaction");
          const approveTx = await tokenContract.approve(
            betAddress,
            wagerAmount
          );
          console.log("Approve transaction sent:", approveTx.hash);

          await approveTx.wait();
          console.log("Approve transaction confirmed");
        }

        // Prepare and send the fundBet transaction
        console.log("Preparing and sending fundBet transaction");
        const fundBetTx = await betContract.fundBet({
          value:
            wagerCurrency === ethers.constants.AddressZero ? wagerAmount : 0,
        });
        console.log("FundBet transaction sent:", fundBetTx.hash);

        const receipt = await fundBetTx.wait();
        console.log("FundBet transaction confirmed:", receipt.transactionHash);

        const betFundedEvent = receipt.events?.find(
          (e) => e.event === "BetFunded"
        );
        if (betFundedEvent) {
          console.log("BetFunded event found");
          const [, funder, amount, newStatus] = betFundedEvent.args;
          const tokenSymbol =
            wagerCurrency === ethers.constants.AddressZero ? "ETH" : "tokens";
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
        } else {
          console.log("BetFunded event not found in transaction receipt");
          setMessage(
            "Transaction confirmed, but BetFunded event not found. Please check the transaction status."
          );
          setIsAlertOpen(true);
        }
      } catch (error: unknown) {
        console.error("Error in handleFundBet:", error);
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
