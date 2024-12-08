import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";

type OrderSide = "BUY" | "SELL";

interface OrderRequest {
  market_id: string;
  price: number;
  amount: number;
  side: "yes" | "no";
}

const mapSideToOrderType = (side: "yes" | "no"): OrderSide => {
  return side === "yes" ? "BUY" : "SELL";
};

export const useOrder = () => {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrder = async (orderRequest: OrderRequest) => {
    try {
      setLoading(true);
      setError(null);

      if (!account) {
        throw new Error("Wallet not connected");
      }

      const orderSide = mapSideToOrderType(orderRequest.side);

      const orderData = {
        user_address: account.address,
        market_id: orderRequest.market_id,
        price: Math.floor(orderRequest.price * 1e6), // Convert to base units
        amount: Math.floor(orderRequest.amount * 1e6), // Convert to base units
        side: orderSide
      };

      console.log("Sending order data:", orderData);

      // Submit the order
      const response = await fetch("/api/delegated-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.msg ||
            errorData.detail ||
            `API error: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
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