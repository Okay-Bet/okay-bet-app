// utils/handleBetActions.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { fundBet, cancelBet, resolveBet, invalidateBet } from "@/generated/bet";
import { ethers } from "ethers";

export const handleFundBet = async (
  betAddress: string,
  wagerWei: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => void,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
    const betContract = getContract({
      client,
      address: betAddress,
      chain: contract.chain,
    });

    const transaction = fundBet({
      contract: betContract,
    });

    const wagerWeiBigInt = BigInt(wagerWei);
    await sendTransaction({ ...transaction, value: wagerWeiBigInt });
    setMessage("Bet funded successfully!");
    setIsAlertOpen(true);
    fetchBetDetails(betAddress); // Refresh bet details
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

export const handleCancelBet = async (
  betAddress: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => void,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
    const betContract = getContract({
      client,
      address: betAddress,
      chain: contract.chain,
    });

    const transaction = cancelBet({
      contract: betContract,
    });

    await sendTransaction(transaction);
    setMessage("Bet canceled successfully!");
    setIsAlertOpen(true);
    fetchBetDetails(betAddress); // Refresh bet details
  } catch (error: unknown) {
    console.error("Error canceling bet:", error);
    if (error instanceof Error) {
      setMessage(
        `Error canceling bet. Please try again. Details: ${error.message}`
      );
    } else {
      setMessage(
        "Error canceling bet. Please try again. An unexpected error occurred."
      );
    }
    setIsAlertOpen(true);
  }
};

export const handleResolveBet = async (
  betAddress: string,
  winnerAddress: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => void,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
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

    await sendTransaction(transaction);
    setMessage("Bet resolved successfully!");
    setIsAlertOpen(true);
    fetchBetDetails(betAddress); // Refresh bet details
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
  }
};

export const handleInvalidateBet = async (
  betAddress: string,
  sendTransaction: any,
  fetchBetDetails: (betAddress: string) => void,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void
) => {
  try {
    const betContract = getContract({
      client,
      address: betAddress,
      chain: contract.chain,
    });

    const transaction = invalidateBet({
      contract: betContract,
    });

    await sendTransaction(transaction);
    setMessage("Bet invalidated successfully!");
    setIsAlertOpen(true);
    fetchBetDetails(betAddress); // Refresh bet details
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
  }
};
