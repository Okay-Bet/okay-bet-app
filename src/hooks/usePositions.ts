// hooks/usePositions.ts
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";

interface Position {
  condition_id: string;
  token_id: string;
  balance: number;           // Historical transfer amount
  current_balance: number;   // Current token balance
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
  const [totalValue, setTotalValue] = useState(0);

  const isMarketResolved = (status: string): boolean => {
    return status.toUpperCase() === 'RESOLVED';
  };

  const calculateTotalValue = (positions: Position[]): number => {
    return positions.reduce((total, position) => {
      // Convert the balance from raw units to decimal units using the token decimals
      const decimals = position.market_data.collateral_token.decimals;
      const currentBalance = position.current_balance / Math.pow(10, decimals);
      
      // For resolved markets, only count winning positions
      if (isMarketResolved(position.status)) {
        if (position.is_winner) {
          return total + currentBalance;
        }
        return total;
      }
      
      // For active markets, count all positions
      return total + currentBalance;
    }, 0);
  };

  useEffect(() => {
    const fetchPositions = async () => {
      console.log('fetchPositions called with account:', account?.address);

      if (!account?.address) return;

      setLoading(true);
      setError(null);

      try {
        console.log('Fetching positions from API...');

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
        console.log('Received API response:', data);


        if (data.completed_orders) {
          const validPositions = data.completed_orders.filter((position: Position) =>
            position?.condition_id && 
            position?.current_balance && // Check for current_balance instead of balance
            position?.market_data
          );

          console.log('Valid positions after filtering:', validPositions);


          const sortedPositions = [...validPositions].sort((a, b) => {
            const aResolved = isMarketResolved(a.status);
            const bResolved = isMarketResolved(b.status);

            // First sort by status (active first, then resolved)
            if (aResolved !== bResolved) {
              return aResolved ? 1 : -1;
            }

            // Then sort by current balance
            const aBalance = a.current_balance / Math.pow(10, a.market_data.collateral_token.decimals);
            const bBalance = b.current_balance / Math.pow(10, b.market_data.collateral_token.decimals);
            return bBalance - aBalance;
          });

          console.log('Setting sorted positions:', sortedPositions);
          setPositions(sortedPositions);
          setTotalValue(calculateTotalValue(sortedPositions));
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

  const getFormattedBalance = (position: Position): string => {
    const decimals = position.market_data.collateral_token.decimals;
    const balance = position.current_balance / Math.pow(10, decimals);
    return balance.toFixed(2);
  };

  return {
    positions,
    loading,
    error, 
    isConnected: !!account?.address,
    totalValue,
    isMarketResolved: (status: string) => isMarketResolved(status),
    getFormattedBalance, // New utility function for formatting balances
  };
}
