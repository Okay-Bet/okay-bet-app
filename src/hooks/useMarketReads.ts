import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../app/client";
import { base } from "thirdweb/chains";

export const useMarketReads = (
  marketAddress: string,
  amount?: bigint,
  outcomeIndex?: bigint
) => {
  const contract = getContract({
    client,
    chain: base,
    address: marketAddress as `0x${string}`,
  });

  const { data: buyAmountData, isPending: buyAmountPending } = useReadContract({
    contract,
    method: "function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)",
    params: amount && outcomeIndex ? [amount, outcomeIndex] : undefined,
  });

  const { data: totalSupplyData, isPending: totalSupplyPending } = useReadContract({
    contract,
    method: "function totalSupply() view returns (uint256)",
    params: [],
  });

  return {
    buyAmountData,
    totalSupplyData,
    isPending: buyAmountPending || totalSupplyPending,
  };
};