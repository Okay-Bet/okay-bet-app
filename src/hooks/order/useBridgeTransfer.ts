import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getAcrossClient } from "../../services/across/client";
import { DepositParams, AcrossQuote } from "../../components/types/bridge";
import { sleep } from "../../services/transaction";
import {
  prepareTokenApproval,
  prepareBridgeTransaction,
  generateBridgeDepositData,
} from "../../services/across/bridge";

// Define base types for blockchain transactions
interface PreparedTransactionBase {
  to: string;
  value?: bigint | string;
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
type EthereumAddress = `0x${string}`;

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

const isValidTransaction = (tx: any): tx is PreparedTransactionBase => {
  return (
    typeof tx === 'object' &&
    typeof tx.to === 'string' &&
    (!tx.value || typeof tx.value === 'string' || typeof tx.value === 'bigint')
  );
};

// Add a transaction normalizer
const normalizeTxValue = (
  transaction: PreparedTransactionBase
): PreparedTransactionBase => {
  const normalizedTx: PreparedTransactionBase = { ...transaction };
  
  // Convert main value if it exists
  if (typeof normalizedTx.value === 'string') {
    normalizedTx.value = BigInt(normalizedTx.value);
  }
  
  // Convert overrides value if it exists
  if (normalizedTx.overrides?.value && typeof normalizedTx.overrides.value === 'string') {
    normalizedTx.overrides = {
      ...normalizedTx.overrides,
      value: BigInt(normalizedTx.overrides.value)
    };
  }
  
  return normalizedTx;
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

const AGENT_WALLET_ADDRESS = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS as EthereumAddress | undefined;

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

  const getValidRecipientAddress = useCallback((): EthereumAddress => {
    if (!AGENT_WALLET_ADDRESS) {
      throw new Error("NEXT_PUBLIC_AGENT_WALLET_ADDRESS is not defined in environment");
    }

    if (!/^0x[0-9a-fA-F]{40}$/i.test(AGENT_WALLET_ADDRESS)) {
      throw new Error(`Invalid Ethereum address format: ${AGENT_WALLET_ADDRESS}`);
    }

    return AGENT_WALLET_ADDRESS;
  }, []);

  const sendUsdcTransfer = useCallback(
    async (rawAmount: string): Promise<TransactionResult> => {
      if (!account) throw new Error("Wallet not connected");

      try {

        const recipientAddress = getValidRecipientAddress();

        // Define our known USDC route configuration
        const BRIDGE_CONFIG = {
          TOKENS: {
            OPTIMISM: {
              USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as const, // Native USDC on Optimism
            },
            POLYGON: {
              USDC_E: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const,
            },
          },
          CHAINS: {
            OPTIMISM: CHAIN_CONFIG.OPTIMISM_CHAIN_ID,
            POLYGON: CHAIN_CONFIG.POLYGON_CHAIN_ID,
          },
        };

        // Initialize Across client
        const client = getAcrossClient();

        console.log("Initiating bridge with configuration:", {
          originChain: BRIDGE_CONFIG.CHAINS.OPTIMISM,
          destChain: BRIDGE_CONFIG.CHAINS.POLYGON,
          inputToken: BRIDGE_CONFIG.TOKENS.OPTIMISM.USDC,
          outputToken: BRIDGE_CONFIG.TOKENS.POLYGON.USDC_E,
          amount: rawAmount,
        });

        // Get quote directly without checking routes
        const rawQuote = await client.getQuote({
          route: {
            originChainId: BRIDGE_CONFIG.CHAINS.OPTIMISM,
            destinationChainId: BRIDGE_CONFIG.CHAINS.POLYGON,
            inputToken: BRIDGE_CONFIG.TOKENS.OPTIMISM.USDC,
            outputToken: BRIDGE_CONFIG.TOKENS.POLYGON.USDC_E,
          },
          inputAmount: BigInt(rawAmount),
          recipient: recipientAddress,
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

        // Validate the quote matches our expected configuration
        if (
          deposit.inputToken.toLowerCase() !==
          BRIDGE_CONFIG.TOKENS.OPTIMISM.USDC.toLowerCase()
        ) {
          console.error("Token mismatch:", {
            expected: BRIDGE_CONFIG.TOKENS.OPTIMISM.USDC,
            received: deposit.inputToken,
          });
          throw new Error("Quote input token doesn't match expected token");
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
            recipient: recipientAddress,
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

        let rawBridgeTx = prepareBridgeTransaction(
          deposit.spokePoolAddress,
          encodedCallData,
          BigInt(0)
        );

        const bridgeTx = normalizeTxValue(rawBridgeTx);

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
    [account, sendTransaction, getValidRecipientAddress]
  );

  return {
    sendUsdcTransfer,
    bridgeStep,
  };
};
