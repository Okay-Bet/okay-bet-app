// hooks/usePositions.ts
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import type { Position } from '@/components/types/position';

export function usePositions() {
  const account = useActiveAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalValue = positions.reduce((sum, position) => {
    let positionValue = 0;
    for (let i = 0; i < position.outcomes.length; i++) {
      positionValue += position.balances[i] * position.prices[i];
    }
    return sum + positionValue;
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
          setPositions(data.completed_orders);
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
  };
}
