// utils/handleBetActions.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { fundBet, cancelBet, resolveBet, invalidateBet } from "@/generated/bet";
import { ethers } from "ethers";

const BASE_MAINNET_RPC = "https://mainnet.base.org";

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

    // Create a provider for Base mainnet
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);

    // Get the current block number before sending the transaction
    const startBlock = await provider.getBlockNumber();

    // Send the transaction
    await sendTransaction({ ...transaction, value: wagerWeiBigInt });

    // Create an ethers contract instance
    const ethersBetContract = new ethers.Contract(
      betAddress,
      [
        "event BetFunded(address funder, uint256 amount)",
      ],
      provider
    );

    // Function to check for the event
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetFunded(),
        startBlock,
        currentBlock
      );

      if (events.length > 0) {
        const [funder, amount] = events[0].args;
        setMessage(`Bet funded successfully! Funder: ${funder}, Amount: ${ethers.utils.formatEther(amount)} ETH`);
        setIsAlertOpen(true);
        fetchBetDetails(betAddress); // Refresh bet details
        return true;
      }
      return false;
    };

    // Check for the event every 2 seconds for up to 30 seconds
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      if (await checkForEvent()) {
        return;
      }
    }

    // If we haven't found the event after 30 seconds
    setMessage("Transaction sent, but event not found. Please check the transaction status.");
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

    // Create a provider for Base mainnet
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);

    // Get the current block number before sending the transaction
    const startBlock = await provider.getBlockNumber();

    // Send the transaction
    await sendTransaction(transaction);

    // Create an ethers contract instance
    const ethersBetContract = new ethers.Contract(
      betAddress,
      [
        "event BetCancelled(address canceller)",
      ],
      provider
    );

    // Function to check for the event
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetCancelled(),
        startBlock,
        currentBlock
      );

      if (events.length > 0) {
        const [canceller] = events[0].args;
        setMessage(`Bet cancelled successfully by ${canceller}!`);
        setIsAlertOpen(true);
        fetchBetDetails(betAddress); // Refresh bet details
        return true;
      }
      return false;
    };

    // Check for the event every 2 seconds for up to 30 seconds
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      if (await checkForEvent()) {
        return;
      }
    }

    // If we haven't found the event after 30 seconds
    setMessage("Transaction sent, but event not found. Please check the transaction status.");
    setIsAlertOpen(true);

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

    const formattedWinnerAddress = ethers.utils.getAddress(winnerAddress) as `0x${string}`;

    const transaction = resolveBet({
      contract: betContract,
      winner: formattedWinnerAddress,
    });

    // Create a provider for Base mainnet
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);

    // Get the current block number before sending the transaction
    const startBlock = await provider.getBlockNumber();

    // Send the transaction
    await sendTransaction(transaction);

    // Create an ethers contract instance
    const ethersBetContract = new ethers.Contract(
      betAddress,
      [
        "event BetResolved(address winner)",
      ],
      provider
    );

    // Function to check for the event
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetResolved(),
        startBlock,
        currentBlock
      );

      if (events.length > 0) {
        const [winner] = events[0].args;
        setMessage(`Bet resolved successfully! Winner: ${winner}`);
        setIsAlertOpen(true);
        fetchBetDetails(betAddress); // Refresh bet details
        return true;
      }
      return false;
    };

    // Check for the event every 2 seconds for up to 30 seconds
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      if (await checkForEvent()) {
        return;
      }
    }

    // If we haven't found the event after 30 seconds
    setMessage("Transaction sent, but event not found. Please check the transaction status.");
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

    // Create a provider for Base mainnet
    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);

    // Get the current block number before sending the transaction
    const startBlock = await provider.getBlockNumber();

    // Send the transaction
    await sendTransaction(transaction);

    // Create an ethers contract instance
    const ethersBetContract = new ethers.Contract(
      betAddress,
      [
        "event BetInvalidated()",
      ],
      provider
    );

    // Function to check for the event
    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await ethersBetContract.queryFilter(
        ethersBetContract.filters.BetInvalidated(),
        startBlock,
        currentBlock
      );

      if (events.length > 0) {
        setMessage("Bet invalidated successfully!");
        setIsAlertOpen(true);
        fetchBetDetails(betAddress); // Refresh bet details
        return true;
      }
      return false;
    };

    // Check for the event every 2 seconds for up to 30 seconds
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      if (await checkForEvent()) {
        return;
      }
    }

    // If we haven't found the event after 30 seconds
    setMessage("Transaction sent, but event not found. Please check the transaction status.");
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
  }
};