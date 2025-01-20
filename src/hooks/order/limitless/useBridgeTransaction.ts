import { useState } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { ethers } from "ethers";
import { client } from "../../../app/client";
import { SPOKE_POOL_ABI } from "../../../constants/spoke-pool-abi";
import { sleep } from "../../../services/transaction";
import { BridgeStep } from "../../../components/types";

// Strongly typed interface for deposit parameters
interface DepositParams {
  quoteTimestamp: number;
  inputAmount: string | bigint;
  outputAmount: string | bigint;
  inputToken: string;
  outputToken: string;
  recipient: string;
  destinationChainId: number | string;
  exclusiveRelayer: string;
  exclusivityDeadline: number;
  message?: string; // Optional for non-multicall transactions
}

// Bridge transaction response type
interface BridgeTransactionResponse {
  transactionHash: string;
  // Add other relevant fields based on your actual response
}

// Validation function with proper type checking
const validateBridgeParameters = (deposit: DepositParams) => {
  console.log("Validating bridge parameters:", deposit);

  // Essential parameter checks
  if (!deposit.quoteTimestamp) {
    throw new Error("Missing quote timestamp");
  }

  if (!deposit.inputAmount || !deposit.outputAmount) {
    throw new Error("Missing amount parameters");
  }

  if (!deposit.inputToken || !deposit.outputToken) {
    throw new Error("Missing token addresses");
  }

  if (!deposit.recipient) {
    throw new Error("Missing recipient address");
  }

  // Address format validation
  const addresses = [
    deposit.inputToken,
    deposit.outputToken,
    deposit.recipient,
  ];
  addresses.forEach((address) => {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid address format: ${address}`);
    }
  });

  console.log("Bridge parameters validation passed");
};

// Transaction monitoring function
const monitorBridgeTransaction = async (txHash: string): Promise<boolean> => {
  const MAX_ATTEMPTS = 20; // 5 minutes with 15s intervals
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    try {
      const response = await fetch(
        `https://across.to/api/deposit-status?transactionHash=${txHash}`
      );
      const status = await response.json();

      console.log(`Transaction status (attempt ${attempts + 1}):`, status);

      if (status.filled) {
        return true;
      }

      if (status.failed || status.cancelled) {
        throw new Error(`Bridge failed: ${status.message || "Unknown error"}`);
      }

      await sleep(15000); // 15 second intervals
      attempts++;
    } catch (error) {
      console.error("Error monitoring transaction:", error);
      throw error;
    }
  }

  throw new Error("Transaction monitoring timeout");
};

export const useBridgeTransaction = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "bridging",
    status: "pending",
  });

  const handleBridgeTransaction = async (
    deposit: DepositParams,
    spokePoolAddress: string,
    multicallMessage: string
  ): Promise<BridgeTransactionResponse> => {
    if (!account) {
      throw new Error("No active account found");
    }

    console.log("=== Starting Bridge Transaction ===");
    console.log("Deposit parameters:", deposit);

    try {
      // Validate all parameters before proceeding
      validateBridgeParameters(deposit);

      // Get contract instance
      const spokePoolContract = getContract({
        client,
        chain: optimism,
        address: spokePoolAddress as `0x${string}`,
        abi: SPOKE_POOL_ABI,
      });

      console.log("Got spoke pool contract:", spokePoolAddress);

      // Prepare transaction parameters with proper type conversion
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const params = [
        account.address, // depositor
        deposit.recipient,
        deposit.inputToken,
        deposit.outputToken,
        BigInt(deposit.inputAmount),
        BigInt(deposit.outputAmount),
        BigInt(deposit.destinationChainId),
        deposit.exclusiveRelayer,
        deposit.quoteTimestamp,
        currentTimestamp + 3600, // fillDeadline: 1 hour window
        deposit.exclusivityDeadline || 0, // Allow 0 for exclusivityDeadline
        multicallMessage,
      ];

      console.log("=== Prepared Parameters ===", {
        depositor: account.address,
        recipient: deposit.recipient,
        inputToken: deposit.inputToken,
        outputToken: deposit.outputToken,
        inputAmount: deposit.inputAmount.toString(),
        outputAmount: deposit.outputAmount.toString(),
        destinationChainId: deposit.destinationChainId.toString(),
        exclusiveRelayer: deposit.exclusiveRelayer,
        quoteTimestamp: deposit.quoteTimestamp,
        fillDeadline: currentTimestamp + 3600,
        exclusivityDeadline: deposit.exclusivityDeadline || 0,
        messageLength: multicallMessage.length,
      });

      // Prepare the contract call
      console.log("Preparing contract call...");
      const rawBridgeTx = prepareContractCall({
        contract: spokePoolContract,
        method: "depositV3",
        params,
      });

      // Get transaction data and estimate gas
      console.log("Contract call prepared, getting data...");
      const [txData, estimatedGas] = await Promise.all([
        rawBridgeTx.data(),
        spokePoolContract.estimateGas.depositV3(...params),
      ]);

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(Number(estimatedGas.toString()) * 1.2);

      const bridgeTx = {
        ...rawBridgeTx,
        data: txData,
        gasLimit,
      };

      console.log("=== Prepared Bridge Transaction ===", {
        tx: bridgeTx,
      });

      setBridgeStep({
        step: "bridging",
        status: "pending",
      });

      return new Promise((resolve, reject) => {
        console.log("Sending transaction...");
        sendTransaction(bridgeTx, {
          onSuccess: async (result) => {
            try {
              console.log("Bridge transaction sent:", result);

              setBridgeStep({
                step: "bridging",
                status: "pending",
                txHash: result.transactionHash,
              });

              // Monitor transaction until completion or failure
              const success = await monitorBridgeTransaction(
                result.transactionHash
              );

              if (success) {
                setBridgeStep({
                  step: "bridging",
                  status: "success",
                  txHash: result.transactionHash,
                });
                resolve(result);
              } else {
                throw new Error("Transaction failed during monitoring");
              }
            } catch (error) {
              console.error("Bridge confirmation failed:", error);
              setBridgeStep({
                step: "bridging",
                status: "failed",
              });
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
        step: "bridging",
        status: "failed",
      });
      throw error;
    }
  };

  return {
    handleBridgeTransaction,
    bridgeStep,
  };
};
