// hooks/useSellPosition.ts
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";

interface SellPositionParams {
  token_id: string;
  price: number;
  amount: number;
  is_yes_token: boolean;
  user_address: string;
}

export function useSellPosition() {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellPosition = async (params: SellPositionParams) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const formattedAmount = Math.floor(params.amount);
      const response = await fetch("/api/delegated-sell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_address: account.address,
          token_id: params.token_id,
          price: params.price,
          amount: formattedAmount,
          is_yes_token: params.is_yes_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sell position");
      }

      return await response.json();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sell position";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sellPosition,
    loading,
    error,
  };
}
