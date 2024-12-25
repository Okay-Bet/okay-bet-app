import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "@/app/client";
import { polygon } from "thirdweb/chains";
import { isAddress } from "ethers/lib/utils";

const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const AGENT_WALLET_ADDRESS = "0x93c7c3f9394dEf62D2Ad0658c1c9b49919C13Ac5";

interface ValidationResponse {
  valid: boolean;
  estimated_total: number;    
  price_impact: number;      
  execution_possible: boolean;
  warning: string | null;
  min_order_size: number;
  max_order_size: number;
}

interface OrderPayload {
  user_address: string;
  token_id: string;
  price: number;
  amount: string;           
  side: "BUY" | "SELL";
  is_yes_token: boolean;
  usdc_transaction_hash?: string;
}

export type OrderStatus =
  | { state: "idle" }
  | { state: "validating" }
  | { state: "validated"; data: ValidationResponse }
  | { state: "preparing_transfer" }
  | { state: "awaiting_signature" }
  | { state: "confirming_transfer"; txHash: string }
  | { state: "submitting_order" }
  | { state: "complete"; result: any }
  | { state: "error"; error: string };

interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: "BUY" | "SELL";
  isYesToken: boolean;
}

export const useOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const toUSDCUnits = (value: number): string => {
    return Math.round(value * 1_000_000).toString();
  };

  const validateOrder = async (orderRequest: OrderRequest) => {
    try {
      setStatus({ state: "validating" });

      if (!account) {
        throw new Error("Wallet not connected");
      }

      // Validate user's address
      if (!isAddress(account.address)) {
        throw new Error(`Invalid user address: ${account.address}`);
      }

      const orderData = {
        user_address: account.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price,
        amount: toUSDCUnits(orderRequest.amount),
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken,
      };

      console.log("Sending validation request:", orderData);

      const validationResponse = await fetch("/api/validate-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await validationResponse.json();

      if (!validationResponse.ok) {
        throw new Error(data.error?.msg || data.detail || "Validation failed");
      }

      console.log("Validation response:", data);

      // Check price impact and add warnings
      if (data.price_impact > 0.05) {
        console.warn(
          `High price impact detected: ${(data.price_impact * 100).toFixed(2)}%`
        );
      }

      // Check execution possibility
      if (!data.execution_possible) {
        throw new Error(
          "Order execution not possible due to insufficient liquidity"
        );
      }

      setStatus({
        state: "validated",
        data: data as ValidationResponse,
      });

      return data;
    } catch (err) {
      console.error("Validation error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Validation failed";
      setStatus({ state: "error", error: errorMessage });
      throw err;
    }
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const sendUsdcTransfer = async (amount: string) => {
    try {
      setStatus({ state: "preparing_transfer" });

      console.log("Preparing USDC transfer:", {
        to: AGENT_WALLET_ADDRESS,
        amount,
        usdcAddress: USDC_ADDRESS,
      });

      const usdcContract = getContract({
        client,
        address: USDC_ADDRESS,
        chain: polygon,
      });

      // Convert the amount string to a bigint
      const transaction = prepareContractCall({
        contract: usdcContract,
        method: "function transfer(address to, uint256 amount)",
        params: [AGENT_WALLET_ADDRESS, BigInt(amount)],
      });

      setStatus({ state: "awaiting_signature" });

      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: async (result) => {
            try {
              setStatus({
                state: "confirming_transfer",
                txHash: result.transactionHash,
              });

              console.log("USDC transfer sent, waiting for confirmation...");
              // Wait for 15 seconds to ensure transaction is confirmed
              await sleep(15000);
              console.log("Proceeding with order submission");

              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          onError: (error) => {
            // Add specific handling for insufficient balance error
            if (
              error instanceof Error &&
              error.message.includes("transfer amount exceeds balance")
            ) {
              setStatus({ state: "error", error: "Insufficient USDC balance" });
              reject(new Error("Insufficient USDC balance"));
              return;
            }
            reject(error);
          },
        });
      });
    } catch (err) {
      console.error("Error preparing transfer:", err);
      throw err;
    }
  };

  const submitOrder = async (orderRequest: OrderRequest) => {
    try {
      // Step 1: Validate Order
      const validationData = await validateOrder(orderRequest);

      if (!validationData.valid) {
        throw new Error("Order validation failed");
      }

      // IMPORTANT: Use estimated_total from validation response
      const orderAmount = validationData.estimated_total.toString();
      console.log("Using order amount:", orderAmount);

      // Step 2: Send USDC Transfer and wait for confirmation
      const txResult: any = await sendUsdcTransfer(orderAmount);

      // Step 3: Submit Delegated Order
      setStatus({ state: "submitting_order" });

      const orderData = {
        user_address: account?.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price,
        amount: orderAmount, // Use the same amount we approved in transfer
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken,
      };

      console.log("Submitting delegated order:", {
        ...orderData,
        usdc_transaction_hash: txResult.transactionHash,
      });

      const response = await fetch("/api/delegated-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          usdc_transaction_hash: txResult.transactionHash,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.msg || errorData.detail || "Failed to submit order"
        );
      }

      const result = await response.json();
      console.log("Order completed:", result);
      setStatus({ state: "complete", result });
      return result;
    } catch (err) {
      console.error("Order error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setStatus({ state: "error", error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    submitOrder,
    status,
    isLoading: [
      "validating",
      "preparing_transfer",
      "awaiting_signature",
      "confirming_transfer",
      "submitting_order",
    ].includes(status.state),
  };
};
