import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getAcrossClient } from "../../services/across/client";
import { DepositParams, AcrossQuote } from "../../components/types/bridge";
import { AGENT_WALLET_ADDRESS, sleep } from "../../services/transaction";
import {
  prepareTokenApproval,
  prepareBridgeTransaction,
  generateBridgeDepositData,
} from "../../services/across/bridge";

// Define base types for blockchain transactions
interface PreparedTransactionBase {
  to: string;
  value?: bigint;
  overrides?: {
    data?: string;
    value?: bigint;
    [key: string]: any;
  };
}

// Standardize transaction result type
type TransactionResult = {
  transactionHash: string;
};

// Define the transaction function signature
type SendTransactionFunction = (
  transaction: PreparedTransactionBase,
  options?: {
    onSuccess?: (result: TransactionResult) => void;
    onError?: (error: Error) => void;
  }
) => Promise<TransactionResult>;

// Bridge step tracking interface
interface BridgeStep {
  step: "approval" | "bridging";
  status: "pending" | "success" | "failed";
  txHash?: string;
}

// Chain configuration
const CHAIN_CONFIG = {
  OPTIMISM_CHAIN_ID: 10,
  POLYGON_CHAIN_ID: 137,
} as const;

// Utility function to safely convert bigint to string
const bigintToString = (value: bigint | string): string => {
  return typeof value === "bigint" ? value.toString() : value;
};

// Utility function for safe JSON stringification of bigint values
const safeStringify = (obj: any): string => {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

// Type guard for quote validation
const isValidQuote = (quote: any): quote is AcrossQuote => {
  return (
    quote &&
    quote.deposit &&
    typeof quote.deposit.spokePoolAddress === "string" &&
    typeof quote.deposit.inputToken === "string"
  );
};

// Quote transformation function
const transformQuote = (rawQuote: any): AcrossQuote => {
  if (!rawQuote || !rawQuote.deposit) {
    throw new Error("Invalid quote format received from Across");
  }

  return {
    deposit: {
      inputAmount: bigintToString(rawQuote.deposit.inputAmount),
      outputAmount: bigintToString(rawQuote.deposit.outputAmount),
      recipient: rawQuote.deposit.recipient,
      message: rawQuote.deposit.message,
      quoteTimestamp: Number(rawQuote.deposit.quoteTimestamp),
      exclusiveRelayer: rawQuote.deposit.exclusiveRelayer,
      exclusivityDeadline: Number(rawQuote.deposit.exclusivityDeadline),
      spokePoolAddress: rawQuote.deposit.spokePoolAddress,
      destinationSpokePoolAddress: rawQuote.deposit.destinationSpokePoolAddress,
      originChainId: Number(rawQuote.deposit.originChainId),
      destinationChainId: Number(rawQuote.deposit.destinationChainId),
      inputToken: rawQuote.deposit.inputToken,
      outputToken: rawQuote.deposit.outputToken,
    },
    limits: {
      minDeposit: bigintToString(rawQuote.limits.minDeposit),
      maxDeposit: bigintToString(rawQuote.limits.maxDeposit),
      maxDepositInstant: bigintToString(rawQuote.limits.maxDepositInstant),
    },
    fees: {
      totalRelayFee: {
        pct: bigintToString(rawQuote.fees.totalRelayFee.pct),
        total: bigintToString(rawQuote.fees.totalRelayFee.total),
      },
    },
  };
};

// Creates a type-safe transaction sender from the thirdweb mutation
function createTransactionSender(mutateAsync: any): SendTransactionFunction {
  return async (transaction, options) => {
    try {
      const result = await mutateAsync(transaction);
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      if (options?.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  };
}

// Main hook implementation
export const useBridgeTransfer = () => {
  // Initialize hooks and state
  const { mutateAsync } = useSendTransaction();
  const sendTransaction = createTransactionSender(mutateAsync);
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

  const sendUsdcTransfer = useCallback(
    async (rawAmount: string): Promise<TransactionResult> => {
      if (!account) throw new Error("Wallet not connected");

      try {
        // Initialize client and get available routes
        const client = getAcrossClient();
        const routes = await client.getAvailableRoutes({
          originChainId: CHAIN_CONFIG.OPTIMISM_CHAIN_ID,
          destinationChainId: CHAIN_CONFIG.POLYGON_CHAIN_ID,
        });

        console.log(
          "All available routes before filtering:",
          routes.map((route) => ({
            symbol: route.inputTokenSymbol,
            originChain: route.originChainId,
            destChain: route.destinationChainId,
            inputToken: route.inputToken,
            outputToken: route.outputToken,
          }))
        );

        // Filter for Optimism to Polygon routes
        const optimismToPolygonRoutes = routes.filter(
          (route) =>
            route.originChainId === 10 && route.destinationChainId === 137
        );

        // Filter for stablecoin routes
        const stablecoinRoutes = optimismToPolygonRoutes.filter((route) => {
          const isStablecoin = ["USDC", "USDC.e", "USDT", "DAI"].includes(
            route.inputTokenSymbol
          );
          console.log(
            `Route ${route.inputTokenSymbol}: Is stablecoin = ${isStablecoin}`
          );
          return isStablecoin;
        });

        const preferredRoute = stablecoinRoutes[0];
        if (!preferredRoute) {
          throw new Error(
            `No available stablecoin bridge routes. Found ${routes.length} total routes, ` +
              `${optimismToPolygonRoutes.length} OP->Polygon routes, ` +
              `${stablecoinRoutes.length} stablecoin routes.`
          );
        }

        // Get quote for the selected route
        const rawQuote = await client.getQuote({
          route: {
            originChainId: preferredRoute.originChainId,
            destinationChainId: preferredRoute.destinationChainId,
            inputToken: preferredRoute.inputToken,
            outputToken: preferredRoute.outputToken,
          },
          inputAmount: BigInt(rawAmount),
          recipient: AGENT_WALLET_ADDRESS,
        });

        const quote = transformQuote(rawQuote);

        if (!isValidQuote(quote)) {
          throw new Error("Invalid quote format after transformation");
        }

        const { deposit } = quote;

        // Validate quote data
        if (!deposit.spokePoolAddress) {
          throw new Error("Missing spoke pool address in quote");
        }

        if (
          deposit.inputToken.toLowerCase() !==
          preferredRoute.inputToken.toLowerCase()
        ) {
          throw new Error("Quote input token doesn't match selected route");
        }

        // Handle token approval
        console.log("Initiating token approval...");
        setBridgeStep({
          step: "approval",
          status: "pending",
        });

        const approvalRequest = prepareTokenApproval(
          deposit.inputToken,
          deposit.spokePoolAddress,
          deposit.inputAmount
        ) as PreparedTransactionBase;

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

                await sleep(15000); // Wait for confirmation
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

        // Execute bridge transaction
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
        ) as PreparedTransactionBase;

        if (!bridgeTx.to || !bridgeTx.overrides?.data) {
          console.error("Invalid transaction object:", {
            has_to: !!bridgeTx.to,
            has_data: !!bridgeTx.overrides?.data,
            tx: bridgeTx,
          });
          throw new Error(
            "Transaction preparation failed - missing required fields"
          );
        }

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
