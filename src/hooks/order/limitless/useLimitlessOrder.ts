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

// Constants for retry logic
const RETRY_DELAYS = [15000, 30000, 60000]; // 15s, 30s, 60s delays
const FILL_CHECK_INTERVAL = 5000; // Check fill status every 5 seconds
const MAX_FILL_WAIT_TIME = 180000; // 3 minutes total wait time

interface FillStatus {
  status: "pending" | "filled" | "failed";
  message?: string;
}

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

  // Utility to sleep
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Check fill status using Across API
  const checkFillStatus = async (txHash: string): Promise<FillStatus> => {
    try {
      const response = await fetch(
        `https://across.to/api/deposit-status?transactionHash=${txHash}`
      );
      const data = await response.json();

      if (data.filled) {
        return { status: "filled" };
      }

      if (data.failed || data.cancelled) {
        return {
          status: "failed",
          message: data.message || "Fill failed or cancelled",
        };
      }

      return { status: "pending" };
    } catch (error) {
      console.error("Error checking fill status:", error);
      return { status: "pending" };
    }
  };

  // Wait for fill with timeout
  const waitForFill = async (txHash: string): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_FILL_WAIT_TIME) {
      const status = await checkFillStatus(txHash);

      if (status.status === "filled") {
        return true;
      }

      if (status.status === "failed") {
        console.warn(`Fill failed: ${status.message}`);
        return false;
      }

      await sleep(FILL_CHECK_INTERVAL);
    }

    return false;
  };

  const getLatestQuote = async (
    multicallMessage: string,
    amountBigInt: bigint
  ) => {
    try {
      // Format amount properly - no scientific notation
      const formattedAmount = amountBigInt.toString();

      // Log the exact message format for debugging
      console.log("Requesting quote with params:", {
        originChainId: 10,
        destinationChainId: 8453,
        amount: formattedAmount,
        messageHex: multicallMessage,
        messageLength: multicallMessage.length,
      });

      const response = await fetch("/api/across-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originChainId: 10,
          destinationChainId: 8453,
          inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC as `0x${string}`,
          outputToken: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
          inputAmount: formattedAmount,
          recipient: MULTICALL_HANDLERS.BASE as `0x${string}`,
          message: multicallMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Quote API error:", {
          status: response.status,
          data,
          requestBody: {
            originChainId: 10,
            destinationChainId: 8453,
            inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC,
            outputToken: SUPPORTED_TOKENS.BASE.USDC,
            inputAmount: formattedAmount,
            recipient: MULTICALL_HANDLERS.BASE,
            messageLength: multicallMessage.length,
          },
        });

        if (data.type === "AcrossApiError") {
          throw new Error(`Across API error: ${data.code} - ${data.message}`);
        }

        throw new Error(data.message || "Failed to fetch quote");
      }

      console.log("Quote received:", {
        inputAmount: data.inputAmount,
        outputAmount: data.outputAmount,
        relayerFeePct: data.relayerFeePct,
      });

      return {
        deposit: {
          ...data,
          inputAmount: BigInt(data.inputAmount),
          outputAmount: BigInt(data.outputAmount),
          relayerFeePct: BigInt(data.relayerFeePct),
          timestamp: Number(data.timestamp),
        },
      };
    } catch (error) {
      console.error("Error getting quote:", error);
      throw error;
    }
  };

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

        // Step 2: Handle token approval
        setBridgeStep({ step: "approval", status: "processing" });
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          amountBigInt.toString()
        );

        // Step 3: Attempt bridge with retries
        setBridgeStep({ step: "bridging", status: "processing" });

        let bridgeResult;
        for (let i = 0; i <= RETRY_DELAYS.length; i++) {
          // Get fresh quote for each attempt
          const quote = await getLatestQuote(multicallMessage, amountBigInt);

          try {
            bridgeResult = await handleBridgeTransaction(
              quote.deposit,
              SPOKE_POOL.OPTIMISM,
              multicallMessage
            );

            // Wait for fill
            const filled = await waitForFill(bridgeResult.hash);
            if (filled) {
              setBridgeStep({ step: "completed", status: "success" });
              return bridgeResult;
            }

            // If we reach here, fill failed but no error thrown
            console.warn(`Attempt ${i + 1} failed to fill, retrying...`);
          } catch (error) {
            console.error(`Bridge attempt ${i + 1} failed:`, error);
          }

          // If this wasn't our last attempt, wait before retrying
          if (i < RETRY_DELAYS.length) {
            await sleep(RETRY_DELAYS[i]);
          }
        }

        // If we get here, all attempts failed
        throw new Error("Bridge transaction failed after all retry attempts");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
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
    [
      account,
      generateMessageForMulticallHandler,
      handleTokenApproval,
      handleBridgeTransaction,
    ]
  );

  return {
    submitOrder,
    isLoading,
    error,
    bridgeStep,
  };
};
