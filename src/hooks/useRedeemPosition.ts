// src/hooks/useRedeemPosition.ts
// this needs to be updated for the clob contract and not the amm one
import { useCallback, useState } from "react";
import { useWallet } from "../app/context/WalletContext";
import { getContract } from "viem";
import { parseAbi } from "viem";

const CONDITIONAL_TOKEN_ABI = parseAbi([
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)",
  "function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint256 indexSet) view returns (bytes32)",
]) as const;

const MARKET_CONTRACT_ABI = parseAbi([
  "function conditionalTokens() view returns (address)",
]) as const;

interface RedeemPositionParams {
  token_id: `0x${string}`;
  is_yes_token: boolean;
  condition_id: `0x${string}`;
  parent_collection_id: `0x${string}`;
}

const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;

export type RedeemStatus = {
  state: "idle" | "redeeming" | "success" | "error";
  error?: string;
  tokenId?: string;
};

export function useRedeemPosition(onSuccess?: () => void) {
  const { address, walletClient, publicClient } = useWallet();
  const [status, setStatus] = useState<RedeemStatus>({ state: "idle" });

  const redeemPosition = useCallback(
    async (params: RedeemPositionParams) => {
      if (!address || !walletClient) {
        throw new Error("Wallet not connected");
      }

      setStatus({ state: "redeeming", tokenId: params.token_id });

      try {
        // Get the conditional tokens contract address
        const marketContract = getContract({
          address: params.token_id,
          abi: MARKET_CONTRACT_ABI,
          publicClient,
        });

        const conditionalTokensAddress = await marketContract.read.conditionalTokens();

        // Calculate indexSet
        const indexSet = BigInt(params.is_yes_token ? 2 : 1);
        if (indexSet <= BigInt(0)) {
          throw new Error("Invalid index set");
        }

        const indexSets = [indexSet];

        // Prepare the transaction
        const { request } = await publicClient.simulateContract({
          address: conditionalTokensAddress,
          abi: CONDITIONAL_TOKEN_ABI,
          functionName: 'redeemPositions',
          args: [
            USDC_ADDRESS,
            params.parent_collection_id,
            params.condition_id,
            indexSets,
          ],
          account: address,
        });

        // Send the transaction
        const hash = await walletClient.writeContract(request);

        // Wait for transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash 
        });

        setStatus({ state: "success", tokenId: params.token_id });
        onSuccess?.();

        // Reset status after 3 seconds
        setTimeout(() => {
          setStatus({ state: "idle" });
        }, 3000);

        return receipt;
      } catch (error) {
        console.error("Redeem process failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Transaction failed";
        setStatus({
          state: "error",
          error: errorMessage,
          tokenId: params.token_id,
        });
        throw new Error(errorMessage);
      }
    },
    [address, walletClient, publicClient, onSuccess]
  );

  return {
    redeemPosition,
    status,
  };
}