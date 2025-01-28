import { useState, useEffect, useRef, useCallback } from "react";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import type { LimitlessMarket } from "@/components/types";

const FPMM_ABI = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function collateralToken() view returns (address)",
  "function conditionalTokens() view returns (address)",
  "function conditions(uint256 index) view returns (bytes32)",
  "function fee() view returns (uint256)",
  "function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)",
  "function calcSellAmount(uint256 returnAmount, uint256 outcomeIndex) view returns (uint256)",
]);

// Create a single public client instance
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Cache configuration
const CACHE_DURATION = 10000; // 10 seconds cache
const REFRESH_INTERVAL = 30000; // 30 seconds refresh

export function useMarketPrices(market: LimitlessMarket | null) {
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

  // Refs for caching and debouncing
  const priceCache = useRef<{ timestamp: number; data: typeof prices } | null>(
    null
  );
  const lastFetchAttempt = useRef<number>(0);

  const fetchPrices = useCallback(async () => {
    if (!market?.contract.address) {
      console.log("No market contract address provided");
      return;
    }

    // Check cache first
    const now = Date.now();
    if (
      priceCache.current &&
      now - priceCache.current.timestamp < CACHE_DURATION
    ) {
      console.log("Using cached prices");
      setPrices(priceCache.current.data);
      return;
    }

    // Implement rate limiting
    if (now - lastFetchAttempt.current < 5000) {
      // 5 second minimum between attempts
      console.log("Rate limit: Too many requests");
      return;
    }

    lastFetchAttempt.current = now;
    setLoading(true);
    setError(null);

    try {
      const INVESTMENT_AMOUNT = 1000000n; // 1 USDC (6 decimals)

      const [yesBuyAmount, noBuyAmount] = await Promise.all([
        publicClient.readContract({
          address: market.contract.address as `0x${string}`,
          abi: FPMM_ABI,
          functionName: "calcBuyAmount",
          args: [INVESTMENT_AMOUNT, 0n],
        }),
        publicClient.readContract({
          address: market.contract.address as `0x${string}`,
          abi: FPMM_ABI,
          functionName: "calcBuyAmount",
          args: [INVESTMENT_AMOUNT, 1n],
        }),
      ]);

      const yesPrice = 1 / (Number(yesBuyAmount) / 1000000);
      const noPrice = 1 / (Number(noBuyAmount) / 1000000);

      const newPrices = {
        yes: { bid: undefined, ask: yesPrice },
        no: { bid: undefined, ask: noPrice },
      };

      // Update cache
      priceCache.current = {
        timestamp: now,
        data: newPrices,
      };

      setPrices(newPrices);
    } catch (err) {
      console.error("Error fetching FPMM prices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  }, [market?.contract.address]);

  useEffect(() => {
    // Clear cache when market changes
    priceCache.current = null;

    // Initial fetch
    fetchPrices();

    // Set up interval for refresh
    const intervalId = setInterval(fetchPrices, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchPrices]);

  return { prices, loading, error };
}
