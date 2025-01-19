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
import { ethers } from "ethers";

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
        // Step 1: Prepare multicall message
        setBridgeStep({ step: "preparing", status: "processing" });
        const amountBigInt = BigInt(orderRequest.amount);
        
        const multicallMessage = generateMessageForMulticallHandler({
          userAddress: account.address,
          marketAddress: orderRequest.tokenId,
          amount: amountBigInt,
          outcomeIndex: orderRequest.isYesToken ? 1 : 0,
          usdcAddress: SUPPORTED_TOKENS.BASE.USDC,
        });

        // Step 2: Get quote with multicall
        const acrossClient = getAcrossClient();
        const quote = await acrossClient.getQuote({
          route: {
            originChainId: 10,
            destinationChainId: 8453,
            inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC as `0x${string}`,
            outputToken: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
          },
          inputAmount: amountBigInt,
          recipient: MULTICALL_HANDLERS.BASE as `0x${string}`,
          crossChainMessage: multicallMessage,
        });

        // Step 3: Token approval
        setBridgeStep({ step: "approval", status: "processing" });
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          quote.deposit.inputAmount.toString()
        );

        // Step 4: Execute bridge transaction
        setBridgeStep({ step: "bridging", status: "processing" });
        const bridgeResult = await handleBridgeTransaction(
          quote.deposit,
          SPOKE_POOL.OPTIMISM,
          multicallMessage
        );

        setBridgeStep({ step: "completed", status: "success" });
        return bridgeResult;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Order submission error:", errorMessage);
        setError(errorMessage);
        setBridgeStep({
          step: bridgeStep.step,
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