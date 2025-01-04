// src/hooks/order/useBridgeTransfer.ts
import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import {
  getAcrossClient,
  prepareDepositCalldata,
} from "../../services/across/client";
import {
  AGENT_WALLET_ADDRESS,
  sleep,
  prepareBridgeTransaction,
} from "../../services/transaction";
import { prepareTokenApproval } from "../../services/across/bridge";

interface AcrossQuote {
  deposit: {
    inputAmount: string;
    outputAmount: string;
    recipient: string;
    message: string;
    quoteTimestamp: number;
    exclusiveRelayer: string;
    exclusivityDeadline: number;
    spokePoolAddress: string;
    destinationSpokePoolAddress: string;
    originChainId: number;
    destinationChainId: number;
    inputToken: string;
    outputToken: string;
  };
  limits: {
    minDeposit: string;
    maxDeposit: string;
    maxDepositInstant: string;
  };
  fees: {
    totalRelayFee: {
      pct: string;
      total: string;
    };
  };
}

interface BridgeStep {
  step: "approval" | "bridging";
  status: "pending" | "success" | "failed";
  txHash?: string;
}

const safeStringify = (obj: any): string => {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

export const useBridgeTransfer = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

  const sendUsdcTransfer = useCallback(
    async (rawAmount: string): Promise<{ transactionHash: string }> => {
      if (!account) throw new Error("Wallet not connected");

      try {
        const client = getAcrossClient();
        const routes = await client.getAvailableRoutes();

        const stablecoinRoutes = routes.filter((route) => {
          const isOptimismToPolygon =
            route.originChainId === 10 && route.destinationChainId === 137;
          const isStablecoin = ["USDC", "USDC.e", "USDT", "DAI"].includes(
            route.inputTokenSymbol
          );
          return isOptimismToPolygon && isStablecoin;
        });

        console.log(
          "Available stablecoin routes:",
          stablecoinRoutes.map((route) => ({
            symbol: route.inputTokenSymbol,
            inputToken: route.inputToken,
            outputToken: route.outputToken,
          }))
        );

        const preferredRoute =
          stablecoinRoutes.find(
            (route) => route.inputTokenSymbol === "USDC.e"
          ) ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "USDT") ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "DAI");

        if (!preferredRoute) {
          throw new Error("No available stablecoin bridge routes");
        }

        console.log("Getting quote with parameters:", {
          originChainId: preferredRoute.originChainId,
          destinationChainId: preferredRoute.destinationChainId,
          inputToken: preferredRoute.inputToken,
          outputToken: preferredRoute.outputToken,
          inputAmount: rawAmount,
          recipient: AGENT_WALLET_ADDRESS,
        });

        const quote = (await client.getQuote({
          route: {
            originChainId: preferredRoute.originChainId,
            destinationChainId: preferredRoute.destinationChainId,
            inputToken: preferredRoute.inputToken,
            outputToken: preferredRoute.outputToken,
          },
          inputAmount: BigInt(rawAmount),
          recipient: AGENT_WALLET_ADDRESS,
        })) as AcrossQuote;

        console.log("Raw quote response:", safeStringify(quote));

        const { deposit } = quote;

        console.log("Quote deposit details:", {
          spokePoolAddress: deposit.spokePoolAddress,
          inputAmount: deposit.inputAmount,
          outputAmount: deposit.outputAmount,
          quoteTimestamp: deposit.quoteTimestamp,
          exclusivityDeadline: deposit.exclusivityDeadline,
        });

        if (!deposit.spokePoolAddress) {
          throw new Error("Missing spoke pool address in quote");
        }

        // Step 1: Handle token approval using ThirdWeb
        console.log("Initiating token approval...");
        setBridgeStep({
          step: "approval",
          status: "pending",
        });

        const approvalRequest = prepareTokenApproval(
          deposit.inputToken,
          deposit.spokePoolAddress,
          deposit.inputAmount
        );

        // Execute approval transaction and wait for confirmation
        await new Promise<void>((resolve, reject) => {
          sendTransaction(approvalRequest, {
            onSuccess: async (result) => {
              try {
                console.log("Approval transaction sent:", {
                  hash: result.transactionHash,
                });

                setBridgeStep({
                  step: "approval",
                  status: "pending",
                  txHash: result.transactionHash,
                });

                await sleep(15000); // Wait for approval to be mined
                console.log("Approval transaction confirmed");

                setBridgeStep({
                  step: "approval",
                  status: "success",
                  txHash: result.transactionHash,
                });

                resolve();
              } catch (error) {
                reject(error);
              }
            },
            onError: (error) => {
              console.error("Approval transaction failed:", error);
              setBridgeStep({
                step: "approval",
                status: "failed",
              });
              reject(error);
            },
          });
        });

        // Step 2: Execute the bridge transaction
        console.log("Initiating bridge transaction...");
        setBridgeStep({
          step: "bridging",
          status: "pending",
        });

        const encodedCallData = await generateBridgeDepositData(
          {
            depositor: account.address,
            recipient: deposit.recipient,
            inputToken: deposit.inputToken,
            outputToken: deposit.outputToken,
            inputAmount: deposit.inputAmount,
            outputAmount: deposit.outputAmount,
            destinationChainId: deposit.destinationChainId,
            exclusiveRelayer: deposit.exclusiveRelayer,
            quoteTimestamp: deposit.quoteTimestamp,
            exclusivityDeadline: deposit.exclusivityDeadline,
            message: deposit.message || "0x",
          },
          deposit.spokePoolAddress
        );

        const bridgeTx = prepareBridgeTransaction(
          deposit.spokePoolAddress,
          encodedCallData,
          BigInt(0)
        );

        return new Promise((resolve, reject) => {
          sendTransaction(bridgeTx, {
            onSuccess: async (result) => {
              try {
                console.log("Bridge transaction sent:", {
                  hash: result.transactionHash,
                });

                setBridgeStep({
                  step: "bridging",
                  status: "pending",
                  txHash: result.transactionHash,
                });

                await sleep(15000);
                console.log("Bridge transaction confirmed");

                setBridgeStep({
                  step: "bridging",
                  status: "success",
                  txHash: result.transactionHash,
                });

                resolve(result);
              } catch (error) {
                reject(error);
              }
            },
            onError: (error) => {
              console.error("Bridge transaction failed:", error);
              setBridgeStep({
                step: "bridging",
                status: "failed",
              });
              reject(error);
            },
          });
        });
      } catch (error) {
        console.error("Bridge preparation failed:", error);
        setBridgeStep({
          ...bridgeStep,
          status: "failed",
        });
        throw error;
      }
    },
    [account, sendTransaction]
  );

  return {
    sendUsdcTransfer,
    bridgeStep,
  };
};
