import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";


interface SellPositionParams {
  token_id: string;  // This is actually the market address
  price: number;
  amount: number;
  is_yes_token: boolean;
}

export function useSellPosition() {
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMarketContract = (marketAddress: string) => {
    return getContract({
      client, 
      chain: base,
      address: marketAddress,
    });
  };

  const calculateSellParams = (params: SellPositionParams) => {
    // Convert price to return amount (the amount of collateral tokens to receive)
    const returnAmount = Math.floor(params.price * params.amount);
    
    // Determine outcome index based on whether it's a YES or NO token
    const outcomeIndex = params.is_yes_token ? 1 : 2;
    
    // Set maxOutcomeTokensToSell to the full amount
    const maxOutcomeTokensToSell = Math.floor(params.amount);

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

      const transaction = prepareContractCall({
        contract,
        method: "function sell(uint256 returnAmount, uint256 outcomeIndex, uint256 maxOutcomeTokensToSell)",
        params: [
          returnAmount,
          outcomeIndex,
          maxOutcomeTokensToSell,
        ],
      });

      const result = await sendTransaction(transaction);
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