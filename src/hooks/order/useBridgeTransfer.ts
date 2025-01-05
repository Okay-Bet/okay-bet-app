// src/hooks/order/useBridgeTransfer.ts
import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getAcrossClient } from "../../services/across/client";
import { DepositParams } from "../../types/bridge";
import { AGENT_WALLET_ADDRESS, sleep } from "../../services/transaction";
import {
  prepareTokenApproval,
  prepareBridgeTransaction,
  generateBridgeDepositData,
} from "../../services/across/bridge";

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

        // Debug logging - let's see ALL routes first
        console.log(
          "All available routes before filtering:",
          routes.map((route) => ({
            symbol: route.inputTokenSymbol,
            originChain: route.originChainId,
            destChain: route.destinationChainId,
            inputToken: route.inputToken,
            outputToken: route.outputToken,
            enabled: route.enabled,
            limits: route.limits,
          }))
        );

        // Split our filtering into steps for debugging
        const optimismToPolygonRoutes = routes.filter((route) => {
          const isCorrectPath =
            route.originChainId === 10 && route.destinationChainId === 137;
          return isCorrectPath;
        });

        console.log(
          "Routes after chain filtering:",
          optimismToPolygonRoutes.map((r) => r.inputTokenSymbol)
        );

        const stablecoinRoutes = optimismToPolygonRoutes.filter((route) => {
          const isStablecoin = ["USDC", "USDC.e", "USDT", "DAI"].includes(
            route.inputTokenSymbol
          );
          console.log(
            `Route ${route.inputTokenSymbol}: Is stablecoin = ${isStablecoin}`
          );
          return isStablecoin;
        });


        // Simplified route selection for debugging
        const preferredRoute = stablecoinRoutes[0];

        if (!preferredRoute) {
          throw new Error(
            `No available stablecoin bridge routes. Found ${routes.length} total routes, ` +
              `${optimismToPolygonRoutes.length} OP->Polygon routes, ` +
              `${stablecoinRoutes.length} stablecoin routes.`
          );
        }

        // Log selected route for debugging
        console.log("Selected route:", {
          symbol: preferredRoute.inputTokenSymbol,
          inputToken: preferredRoute.inputToken,
          outputToken: preferredRoute.outputToken,
          limits: preferredRoute.limits,
        });

        // Get quote with enhanced error handling
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

        // Validate deposit parameters
        if (!deposit.spokePoolAddress) {
          throw new Error("Missing spoke pool address in quote");
        }

        if (
          deposit.inputToken.toLowerCase() !==
          preferredRoute.inputToken.toLowerCase()
        ) {
          throw new Error("Quote input token doesn't match selected route");
        }

        console.log("Quote deposit details:", {
          spokePoolAddress: deposit.spokePoolAddress,
          inputToken: deposit.inputToken,
          outputToken: deposit.outputToken,
          inputAmount: deposit.inputAmount,
          outputAmount: deposit.outputAmount,
          quoteTimestamp: deposit.quoteTimestamp,
          exclusivityDeadline: deposit.exclusivityDeadline,
        });

        // Step 1: Handle token approval
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

        // Execute approval with enhanced error handling
        await new Promise<void>((resolve, reject) => {
          sendTransaction(approvalRequest, {
            onSuccess: async (result) => {
              try {
                console.log("Approval transaction sent:", {
                  hash: result.transactionHash,
                  token: deposit.inputToken,
                  spender: deposit.spokePoolAddress,
                  amount: deposit.inputAmount,
                });

                setBridgeStep({
                  step: "approval",
                  status: "pending",
                  txHash: result.transactionHash,
                });

                await sleep(15000);
                console.log("Approval transaction confirmed");

                setBridgeStep({
                  step: "approval",
                  status: "success",
                  txHash: result.transactionHash,
                });

                resolve();
              } catch (error) {
                console.error("Approval confirmation failed:", error);
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

        // Step 2: Execute bridge transaction
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
            exclusivityPeriod: deposit.exclusivityDeadline,
            message: deposit.message || "0x",
          },
          deposit.spokePoolAddress
        );

        const bridgeTx = prepareBridgeTransaction(
          deposit.spokePoolAddress,
          encodedCallData,
          BigInt(0)
        );
        
        // Validate the transaction object
        if (!bridgeTx.to || !bridgeTx.overrides?.data) {
          console.error("Invalid transaction object:", {
            has_to: !!bridgeTx.to,
            has_data: !!bridgeTx.overrides?.data,
            tx: bridgeTx
          });
          throw new Error("Transaction preparation failed - missing required fields");
        }
        
        console.log("Pre-send transaction validation:", {
          to: bridgeTx.to,
          dataLength: bridgeTx.overrides.data.length,
          value: bridgeTx.value?.toString() || '0',
        });

        return new Promise((resolve, reject) => {
          sendTransaction(bridgeTx, {
            onSuccess: async (result) => {
              try {
                console.log("Bridge transaction sent:", {
                  hash: result.transactionHash,
                  spokePool: deposit.spokePoolAddress,
                  inputToken: deposit.inputToken,
                  amount: deposit.inputAmount,
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
                console.error("Bridge confirmation failed:", error);
                reject(error);
              }
            },
            onError: (error) => {
              console.error("Bridge transaction failed:", {
                error,
                spokePool: deposit.spokePoolAddress,
                inputToken: deposit.inputToken,
              });
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
