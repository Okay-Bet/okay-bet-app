// utils/handleUsernameActions/handleRegisterUsername.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { registerUsername, usernameRegisteredEvent } from "@/generated/usernameRegistry";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import { debouncedEmit } from "@/utils/sharedFunctions";
import eventEmitter from "@/events/eventEmitter";
import UsernameRegistryABI from '@/constants/UsernameRegistryABI.json';

export const handleRegisterUsername = async (
  usernameRegistryAddress: string,
  username: string,
  sendTransaction: any,
  setMessage: (message: string) => void,
  setIsAlertOpen: (isOpen: boolean) => void,
  setIsActionLoading: (isLoading: boolean) => void
) => {
  try {
    eventEmitter.emit("refreshStart");
    setIsActionLoading(true);

    const usernameRegistryContract = getContract({
      client,
      address: usernameRegistryAddress,
      chain: contract.chain,
    });

    const transaction = registerUsername({
      contract: usernameRegistryContract,
      username: username.toLowerCase(),
    });

    const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
    const startBlock = await provider.getBlockNumber();

    await sendTransaction(transaction);

    const iface = new ethers.utils.Interface(UsernameRegistryABI);

    const checkForEvent = async () => {
      const currentBlock = await provider.getBlockNumber();
      const events = await provider.getLogs({
        ...usernameRegisteredEvent(),
        fromBlock: startBlock,
        toBlock: currentBlock,
        address: usernameRegistryAddress,
      });

      if (events.length > 0) {
        const event = events[0];
        const decodedEvent = iface.parseLog(event);
        setMessage(`Username "${decodedEvent.args.username}" registered successfully!`);
        setIsAlertOpen(true);
        await debouncedEmit();
        setIsActionLoading(false);
        return true;
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
    console.error("Error registering username:", error);
    if (error instanceof Error) {
      setMessage(
        `Error registering username. Please try again. Details: ${error.message}`
      );
    } else {
      setMessage(
        "Error registering username. Please try again. An unexpected error occurred."
      );
    }
    setIsAlertOpen(true);
  } finally {
    setIsActionLoading(false);
    eventEmitter.emit("refreshComplete");
  }
};