import { useState, useEffect } from "react";
import { useWallet } from "../app/context/WalletContext";
import {  parseAbi } from "viem";
import { Position, PositionValues } from "../components/types";

interface PositionsApiResponse {
  completed_orders: Position[];
  pending_orders: Position[];
  redeemable_count: number;
}

const FPMM_ABI = parseAbi([
  "function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256 outcomeTokenSellAmount)",
]);



export function usePositions() {
  const { address, isConnected, publicClient } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [positionValues, setPositionValues] = useState<PositionValues>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isMarketResolved = (status: string): boolean => {
    return status.toUpperCase() === "RESOLVED";
  };

  const getPositionOutcome = (position: Position): string => {
    return position.outcome === 0 ? "No" : "Yes";
  };

  const getMarketResult = (position: Position): string | undefined => {
    if (!isMarketResolved(position.status)) {
      return undefined;
    }
    return position.position_result || undefined;
  };

  const getMarketPrice = async (position: Position): Promise<number> => {
    try {
      if (
        !position.market_data.contract?.address ||
        !/^0x[a-fA-F0-9]{40}$/.test(position.market_data.contract.address)
      ) {
        throw new Error("Invalid contract address");
      }

      const TEST_SELL_AMOUNT = 1000000n; // 1 USDC (6 decimals)
      const tokensNeeded = await publicClient.readContract({
        address: position.market_data.contract.address as `0x${string}`,
        abi: FPMM_ABI,
        functionName: "calcSellAmount",
        args: [TEST_SELL_AMOUNT, BigInt(position.outcome)],
      });

      if (tokensNeeded <= 0n) {
        throw new Error("Invalid tokens needed amount");
      }

      return Number(TEST_SELL_AMOUNT) / Number(tokensNeeded);
    } catch (error) {
      console.error("[usePositions] Error getting market price:", error);
      return 1 / 3; // Fallback price
    }
  };

  const calculatePositionValue = async (
    position: Position
  ): Promise<number> => {
    const decimals = position.market_data.collateral_token.decimals;
    const currentBalance = position.current_balance / Math.pow(10, decimals);

    if (isMarketResolved(position.status)) {
      // Use position_result to determine value
      return position.position_result === "won" ? currentBalance : 0;
    }

    const price = await getMarketPrice(position);
    return Math.round(currentBalance * price * 1000) / 1000;
  };

  const updateAllPositionValues = async (positions: Position[]) => {
    const values: PositionValues = {};
    let total = 0;

    await Promise.all(
      positions.map(async (position) => {
        const value = await calculatePositionValue(position);
        values[position.token_id] = value;
        total += value;
      })
    );

    setPositionValues(values);
    setTotalValue(Math.round(total * 1000) / 1000);
  };

  useEffect(() => {
    const fetchPositions = async () => {
      if (!address || !isConnected) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/positions/${address}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.msg ||
              errorData.detail ||
              "Failed to fetch positions"
          );
        }

        const data = (await response.json()) as PositionsApiResponse;

        if (data.completed_orders) {

          // Type guard to validate Position object
          const isValidPosition = (position: any): position is Position => {
            return (
              position &&
              typeof position.condition_id === "string" &&
              typeof position.current_balance === "number" &&
              position.market_data &&
              typeof position.market_data === "object"
            );
          };

          const validPositions = data.completed_orders
            .filter(isValidPosition)
            .sort((a: Position, b: Position) => {
              // Sort by status (active first) and then by balance
              const aResolved = isMarketResolved(a.status);
              const bResolved = isMarketResolved(b.status);

              if (aResolved !== bResolved) {
                return aResolved ? 1 : -1;
              }

              // For resolved markets, put winning positions first
              if (aResolved && bResolved) {
                const aWon = a.position_result === "won";
                const bWon = b.position_result === "won";
                if (aWon !== bWon) {
                  return aWon ? -1 : 1;
                }
              }

              // Sort by balance
              const aBalance =
                a.current_balance /
                Math.pow(10, a.market_data.collateral_token.decimals);
              const bBalance =
                b.current_balance /
                Math.pow(10, b.market_data.collateral_token.decimals);
              return bBalance - aBalance;
            });

          setPositions(validPositions);
          await updateAllPositionValues(validPositions);
        }
      } catch (err) {
        console.error("[usePositions] Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load positions"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [address, isConnected, refreshTrigger, updateAllPositionValues]);


  const refreshPositions = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getFormattedBalance = (position: Position): string => {
    const decimals = position.market_data.collateral_token.decimals;
    const balance = position.current_balance / Math.pow(10, decimals);
    return balance.toFixed(2);
  };

  return {
    positions,
    loading,
    error,
    isConnected,
    totalValue,
    positionValues,
    isMarketResolved,
    getFormattedBalance,
    getPositionOutcome,
    getMarketResult,
    refreshPositions,
  };
}
