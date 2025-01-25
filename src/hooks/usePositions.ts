// hooks/usePositions.ts
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";

interface Position {
  condition_id: string;
  token_id: string;
  balance: number;
  outcome: number;
  status: string;
  expiration_timestamp: number;
  user_address: string;
  transaction_hash: string;
  is_winner?: boolean;
  market_data: {
    question: string;
    description: string;
    outcomes: string;
    volume: string;
    liquidity: string;
    status: string;
    winning_outcome?: number;
    collateral_token: {
      address: string;
      decimals: number;
      symbol: string;
    };
  };
}

export function usePositions() {
  const account = useActiveAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMarketResolved = (status: string): boolean => {
    return status.toUpperCase() === 'RESOLVED';
  };

  const totalValue = 0;

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
          const validPositions = data.completed_orders.filter((position: Position) =>
            position?.condition_id && 
            position?.balance && 
            position?.market_data
          );

          const sortedPositions = [...validPositions].sort((a, b) => {
            const aResolved = isMarketResolved(a.status);
            const bResolved = isMarketResolved(b.status);

            if (aResolved !== bResolved) {
              return aResolved ? 1 : -1;
            }

            return b.balance - a.balance;
          });

          setPositions(sortedPositions);
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setError(err instanceof Error ? err.message : "Failed to load positions");
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
    isMarketResolved: (status: string) => isMarketResolved(status),
  };
}