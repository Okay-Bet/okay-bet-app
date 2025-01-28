import { useState } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";

const MARKET_ABI = [{
  type: "function",
  name: "sell",
  inputs: [
    { type: "uint256", name: "returnAmount" },
    { type: "uint256", name: "outcomeIndex" },
    { type: "uint256", name: "maxOutcomeTokensToSell" }
  ],
  outputs: [],
  stateMutability: "nonpayable"
}] as const;

interface SellPositionParams {
  token_id: string;  // This is actually the market address
  price: number;
  amount: number;
  is_yes_token: boolean;
}

export function useSellPosition() {
  const account = useActiveAccount();
  const { mutate: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMarketContract = (marketAddress: string) => {
    return getContract({
      client, 
      chain: base,
      address: marketAddress,
      abi: MARKET_ABI
    });
  };

  const calculateSellParams = (params: SellPositionParams) => {
    // Convert price to return amount (the amount of collateral tokens to receive)
    // Multiply by 1e6 for USDC decimals and convert to BigInt
    const returnAmount = BigInt(Math.floor(params.price * params.amount * 1e6));
    
    // Determine outcome index based on whether it's a YES or NO token
    const outcomeIndex = BigInt(params.is_yes_token ? 1 : 2);
    
    // Convert amount to BigInt with proper decimals
    const maxOutcomeTokensToSell = BigInt(Math.floor(params.amount * 1e6));

    return {
      returnAmount,
      outcomeIndex,
      maxOutcomeTokensToSell,
    };
  };

  const sellPosition = async (params: SellPositionParams) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      // Get contract instance using the token_id as the market address
      const contract = getMarketContract(params.token_id);
      
      const { returnAmount, outcomeIndex, maxOutcomeTokensToSell } = calculateSellParams(params);

      console.log("Selling position with params:", {
        returnAmount: returnAmount.toString(),
        outcomeIndex: outcomeIndex.toString(),
        maxOutcomeTokensToSell: maxOutcomeTokensToSell.toString(),
      });

      const transaction = prepareContractCall({
        contract,
        method: "sell",
        params: [
          returnAmount,
          outcomeIndex,
          maxOutcomeTokensToSell,
        ],
      });

      const result =await sendAndConfirmTx(transaction as unknown as Parameters<typeof sendAndConfirmTx>[0]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sell position";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sellPosition,
    loading,
    error,
  };
}
