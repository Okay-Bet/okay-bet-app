import { useState, useEffect } from "react";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import type { Market } from "@/components/types";

// The correct FPMM ABI based on Gnosis/Polymarket implementation
const FPMM_ABI = parseAbi([
  // Core market maker functions
  "function totalSupply() view returns (uint256)",
  "function collateralToken() view returns (address)",
  "function conditionalTokens() view returns (address)",
  "function conditions(uint256 index) view returns (bytes32)",
  "function fee() view returns (uint256)",
  // State changing functions we need for price calculation
  "function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)",
  "function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export function useMarketPrices(market: Market | null) {
  const [prices, setPrices] = useState({
    yes: {
      bid: undefined as number | undefined,
      ask: undefined as number | undefined,
    },
    no: {
      bid: undefined as number | undefined,
      ask: undefined as number | undefined,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!market?.contract.address) {
      console.log("No market contract address provided");
      return;
    }

    async function fetchPrices() {
      setLoading(true);
      setError(null);

      try {
        console.log("Fetching prices for FPMM:", market.contract.address);

        // Use a standard investment amount for price calculation
        // We'll use 1 unit of collateral (e.g., 1 USDC) to calculate the price
        const INVESTMENT_AMOUNT = 1000000n; // 1 USDC (6 decimals)

        // Calculate prices by simulating buys for both outcomes
        const [yesBuyAmount, noBuyAmount] = await Promise.all([
          publicClient.readContract({
            address: market.contract.address as `0x${string}`,
            abi: FPMM_ABI,
            functionName: "calcBuyAmount",
            args: [INVESTMENT_AMOUNT, 0n], // YES position
          }),
          publicClient.readContract({
            address: market.contract.address as `0x${string}`,
            abi: FPMM_ABI,
            functionName: "calcBuyAmount",
            args: [INVESTMENT_AMOUNT, 1n], // NO position
          }),
        ]);

        console.log("Buy amounts for 1 USDC:", {
          yes: yesBuyAmount.toString(),
          no: noBuyAmount.toString(),
        });

        // Calculate prices (inverse of the buy amounts)
        // Price = 1 / (tokens received per unit of collateral)
        const yesPrice = 1 / (Number(yesBuyAmount) / 1000000); // Convert back from 6 decimals
        const noPrice = 1 / (Number(noBuyAmount) / 1000000);

        console.log("Calculated prices:", {
          yes: yesPrice,
          no: noPrice,
        });

        setPrices({
          yes: { bid: undefined, ask: yesPrice },
          no: { bid: undefined, ask: noPrice },
        });
      } catch (err) {
        console.error("Error fetching FPMM prices:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : "Unknown error",
          market: market.contract.address,
        });
        setError(err instanceof Error ? err.message : "Failed to fetch prices");
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();

    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [market?.contract.address]);

  return { prices, loading, error };
}
