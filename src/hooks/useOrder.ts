import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Polygon USDC
const AGENT_WALLET_ADDRESS = process.env.AGENT_WALLET_ADDRESS;

interface OrderRequest {
  tokenId: string;
  price: number;
  amount: number;
  side: "BUY" | "SELL";
  isYesToken: boolean;
}

// Convert to USDC contract format (6 decimals)
const toUSDCUnits = (value: number): string => {
  // Multiply by 10^6 and round to handle floating point precision
  return Math.round(value * 1_000_000).toString();
};

export const useOrder = () => {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrder = async (orderRequest: OrderRequest) => {
    try {
      setLoading(true);
      setError(null);

      if (!account) {
        throw new Error("Wallet not connected");
      }

      const orderData = {
        user_address: account.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price, 
        amount: toUSDCUnits(orderRequest.amount),
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken
      };

      console.log("Validating order...", orderData);

      const validationResponse = await fetch("/api/validate-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        throw new Error(
          errorData.error?.msg ||
            errorData.detail ||
            `Validation error: ${validationResponse.status}`
        );
      }

      const validationData = await validationResponse.json();

      // Send USDC to agent
      console.log("Sending USDC to agent...");
      const txResult = await sendTransaction({
        to: USDC_ADDRESS,
        data: {
          functionName: "transfer",
          args: [AGENT_WALLET_ADDRESS, validationData.usdc_amount],
        },
      });

      // Submit final order with transaction hash
      const finalOrderResponse = await fetch("/api/delegated-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...orderData,
          usdc_transaction_hash: txResult.transactionHash,
        }),
      });

      if (!finalOrderResponse.ok) {
        const errorData = await finalOrderResponse.json();
        throw new Error(
          errorData.error?.msg ||
            errorData.detail ||
            `Order submission error: ${finalOrderResponse.status}`
        );
      }

      return await finalOrderResponse.json();
    } catch (err) {
      console.error("Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitOrder,
    loading,
    error,
  };
};
