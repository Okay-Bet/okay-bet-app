import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { Position, PositionValues } from "../components/types";

const FPMM_ABI = parseAbi([
  "function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256 outcomeTokenSellAmount)",
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export function usePositions() {
  const account = useActiveAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [positionValues, setPositionValues] = useState<PositionValues>({});

  const isMarketResolved = (status: string): boolean => {
    return status.toUpperCase() === "RESOLVED";
  };

  const getMarketPrice = async (position: Position): Promise<number> => {
    try {
      if (
        !position.contract?.address ||
        !/^0x[a-fA-F0-9]{40}$/.test(position.contract.address)
      ) {
        throw new Error("Invalid contract address");
      }

      const TEST_SELL_AMOUNT = 1000000n; // 1 USDC (6 decimals)
      const tokensNeeded = await publicClient.readContract({
        address: position.contract.address as `0x${string}`,
        abi: FPMM_ABI,
        functionName: "calcSellAmount",
        args: [TEST_SELL_AMOUNT, BigInt(position.outcome)],
      });

      if (tokensNeeded <= 0n) {
        throw new Error("Invalid tokens needed amount");
      }

      return Number(TEST_SELL_AMOUNT) / Number(tokensNeeded);
    } catch (error) {
      return 1 / 3; // Fallback price
    }
  };

  const calculatePositionValue = async (
    position: Position
  ): Promise<number> => {
    const decimals = position.market_data.collateral_token.decimals;
    const currentBalance = position.current_balance / Math.pow(10, decimals);

    if (isMarketResolved(position.status)) {
      return position.is_winner ? currentBalance : 0;
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
          const validPositions = data.completed_orders
            .filter(
              (position: Position) =>
                position?.condition_id &&
                position?.current_balance &&
                position?.market_data
            )
            .sort((a: Position, b: Position) => {
              const aResolved = isMarketResolved(a.status);
              const bResolved = isMarketResolved(b.status);

              if (aResolved !== bResolved) {
                return aResolved ? 1 : -1;
              }

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
        setError(
          err instanceof Error ? err.message : "Failed to load positions"
        );
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
    positionValues,
    isMarketResolved,
    getFormattedBalance,
  };
}
