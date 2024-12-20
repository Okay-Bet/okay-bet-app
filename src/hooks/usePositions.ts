// hooks/usePositions.ts
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import type { Position } from "@/components/types/position";

export function usePositions() {
  const account = useActiveAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to determine if market is resolved based on prices
  const isMarketResolved = (prices: number[]): boolean => {
    return prices.some((price) => price === 1.0 || price === 0.0);
  };

  // Calculate total portfolio value - only for active positions
  const totalValue = positions.reduce((total, position) => {
    // Skip resolved markets (like the Fed position)
    if (isMarketResolved(position.prices)) return total;

    const balance = position.balances[0] / 1_000_000; // Convert to display units
    const price = position.prices[0];
    const value = balance * price;

    console.log(
      `Active position value for ${position.market_question}: ${value}`
    );
    return total + value;
  }, 0);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!account?.address) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/positions/${account.address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.msg ||
              errorData.detail ||
              "Failed to fetch positions"
          );
        }

        const data = await response.json();
        if (data.completed_orders) {
          // Sort positions: active first (by value), then resolved
          const sortedPositions = [...data.completed_orders].sort((a, b) => {
            const aResolved = isMarketResolved(a.prices);
            const bResolved = isMarketResolved(b.prices);

            // If resolution status is different, put active first
            if (aResolved !== bResolved) {
              return aResolved ? 1 : -1;
            }

            // If both active or both resolved, sort by value
            const aValue = (a.balances[0] / 1_000_000) * a.prices[0];
            const bValue = (b.balances[0] / 1_000_000) * b.prices[0];
            return bValue - aValue;
          });

          setPositions(sortedPositions);
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load positions"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [account?.address]);

  return {
    positions,
    loading,
    error,
    isConnected: !!account?.address,
    totalValue,
    isMarketResolved,
  };
}
