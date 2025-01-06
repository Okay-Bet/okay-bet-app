// hooks/usePositions.ts
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import type { Position, MarketData } from "@/components/types/position";

export function usePositions() {
  const account = useActiveAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMarketResolved = (prices: number[]): boolean => {
    if (!Array.isArray(prices)) return false;
    return prices.some((price) => price === 1.0 || price === 0.0);
  };

  const totalValue = positions.reduce((total, position) => {
    if (
      !position?.prices ||
      !Array.isArray(position.prices) ||
      !position.prices.length
    ) {
      return total;
    }
    if (
      !position?.balances ||
      !Array.isArray(position.balances) ||
      !position.balances.length
    ) {
      return total;
    }
    if (isMarketResolved(position.prices)) {
      return total;
    }

    const balance = position.balances[0] / 1_000_000;
    const price = position.prices[0] ?? 0; // Using nullish coalescing
    const value = balance * price;
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
          // Add type safety checks for filtering
          const validPositions = data.completed_orders.filter(
            (position: Position) =>
              position?.condition_id &&
              Array.isArray(position?.prices) &&
              position.prices.length > 0 &&
              Array.isArray(position?.balances) &&
              position.balances.length > 0
          );

          const sortedPositions = [...validPositions].sort((a, b) => {
            const aResolved = isMarketResolved(a.prices);
            const bResolved = isMarketResolved(b.prices);

            if (aResolved !== bResolved) {
              return aResolved ? 1 : -1;
            }

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
