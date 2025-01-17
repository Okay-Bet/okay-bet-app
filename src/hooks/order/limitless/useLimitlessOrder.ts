import { useState, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  getAcrossClient,
  SPOKE_POOL,
  MULTICALL_HANDLERS,
  SUPPORTED_TOKENS,
} from "../../../services/across/client";
import { OrderRequest } from "../../../components/types";
import { useMulticallMessage } from "./useMulticallMessage";
import { useTokenApproval } from "./useTokenApproval";
import { useBridgeTransaction } from "./useBridgeTransaction";
import { BridgeStep } from "../../../components/types";

export const useLimitlessOrder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

  const generateMessageForMulticallHandler = useMulticallMessage();
  const { handleTokenApproval } = useTokenApproval();
  const { handleBridgeTransaction } = useBridgeTransaction();

  const submitOrder = useCallback(
    async (orderRequest: OrderRequest) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const acrossClient = getAcrossClient();
        const amountBigInt = BigInt(orderRequest.amount);

        // 1. Generate multicall instructions with fallback
        const multicallMessage = generateMessageForMulticallHandler(
          account.address,
          orderRequest.tokenId,
          amountBigInt,
          orderRequest.isYesToken ? 1 : 0
        );

        console.log("Generated multicall message:", multicallMessage);

        const crossChainMessage = {
          actions: [
            {
              target: MULTICALL_HANDLERS.BASE as `0x${string}`,
              callData: multicallMessage as `0x${string}`,
              value: BigInt(0),
            },
          ],
          fallbackRecipient: account.address as `0x${string}`,
          revertOnFail: false,
        };

        // 3. Get Across quote with the multicall message
        const quote = await acrossClient.getQuote({
          route: {
            originChainId: 10, // Optimism
            destinationChainId: 8453, // Base
            inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC as `0x${string}`,
            outputToken: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
          },
          inputAmount: amountBigInt,
          recipient: MULTICALL_HANDLERS.BASE as `0x${string}`,
          crossChainMessage,
        });

        console.log("Received Across quote:", quote);

        // 4. Approve USDC spend
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          quote.deposit.inputAmount.toString()
        );

        console.log("USDC approval completed, proceeding with bridge");

        // 5. Execute bridge transaction with multicall message
        const bridgeResult = await handleBridgeTransaction(
          quote.deposit,
          SPOKE_POOL.OPTIMISM,
          multicallMessage // Pass the message to the bridge transaction
        );

        console.log("Bridge transaction completed:", bridgeResult);

        // // Start monitoring with recovery
        // monitorBridgeAndRecover(bridgeResult).catch((error) => {
        //   console.error("Bridge monitoring/recovery error:", error);
        //   setError(error.message);
        // });

        return bridgeResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Order submission error:", errorMessage);
        setError(errorMessage);
        setBridgeStep({
          ...bridgeStep,
          status: "failed",
        });
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [account, generateMessageForMulticallHandler, handleTokenApproval, handleBridgeTransaction]
  );

  return {
    submitOrder,
    isLoading,
    error,
    bridgeStep,
  };
};