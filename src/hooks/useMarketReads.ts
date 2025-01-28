import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../app/client";
import { base } from "thirdweb/chains";

const MARKET_ABI = [
  {
    type: "function",
    name: "calcBuyAmount",
    inputs: [
      { type: "uint256", name: "investmentAmount" },
      { type: "uint256", name: "outcomeIndex" }
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  }
] as const;

export const useMarketReads = (
  marketAddress: string,
  amount?: bigint,
  outcomeIndex?: bigint
) => {
  const contract = getContract({
    client,
    chain: base,
    address: marketAddress as `0x${string}`,
    abi: MARKET_ABI
  });

  // Call hooks directly at the top level
  const buyAmountQuery = useReadContract({
    contract,
    method: "calcBuyAmount",
    params: amount && outcomeIndex ? [amount, outcomeIndex] as const : async () => [BigInt(0), BigInt(0)] as const,
  });

  const totalSupplyQuery = useReadContract({
    contract,
    method: "totalSupply",
    params: [] as const
  });

  // Return processed data
  return {
    buyAmountData: buyAmountQuery.data,
    totalSupplyData: totalSupplyQuery.data,
    isPending: buyAmountQuery.isPending || totalSupplyQuery.isPending,
    error: buyAmountQuery.error || totalSupplyQuery.error,
  };
};

// Export the ABI if needed elsewhere
export { MARKET_ABI };
