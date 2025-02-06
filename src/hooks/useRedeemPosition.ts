import { useCallback, useState } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";
import { createPublicClient, http } from "viem";
import { base as viemBase } from "viem/chains";
import { getContract as getViemContract } from "viem";

const CONDITIONAL_TOKEN_ABI = [
  {
    type: "function",
    name: "redeemPositions",
    inputs: [
      { type: "address", name: "collateralToken" },
      { type: "bytes32", name: "parentCollectionId" },
      { type: "bytes32", name: "conditionId" },
      { type: "uint256[]", name: "indexSets" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCollectionId",
    inputs: [
      { type: "bytes32", name: "parentCollectionId" },
      { type: "bytes32", name: "conditionId" },
      { type: "uint256", name: "indexSet" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
] as const;

const MARKET_CONTRACT_ABI = [
  {
    constant: true,
    inputs: [],
    name: "conditionalTokens",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

interface RedeemPositionParams {
  token_id: `0x${string}`;
  is_yes_token: boolean;
  condition_id: `0x${string}`;
  parent_collection_id: `0x${string}`;
}

const publicClient = createPublicClient({
  chain: viemBase,
  transport: http(),
});

// Constants
const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

export type RedeemStatus = {
  state: "idle" | "redeeming" | "success" | "error";
  error?: string;
  tokenId?: string;
};

export function useRedeemPosition(onSuccess?: () => void) {
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const [status, setStatus] = useState<RedeemStatus>({ state: "idle" });

  const redeemPosition = useCallback(
    async (params: RedeemPositionParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      setStatus({ state: "redeeming", tokenId: params.token_id });

      try {
        const marketContract = getViemContract({
          address: params.token_id,
          abi: MARKET_CONTRACT_ABI,
          client: publicClient,
        });

        const conditionalTokensAddress =
          (await marketContract.read.conditionalTokens()) as `0x${string}`;

        const conditionalTokensContract = getContract({
          client,
          chain: base,
          address: conditionalTokensAddress,
          abi: CONDITIONAL_TOKEN_ABI,
        });

        const indexSet = BigInt(params.is_yes_token ? 2 : 1);
        if (indexSet <= BigInt(0)) {
          throw new Error("Invalid index set");
        }

        const indexSets = [indexSet];

        const transaction = prepareContractCall({
          contract: conditionalTokensContract,
          method: "redeemPositions",
          params: [
            USDC_ADDRESS,
            params.parent_collection_id,
            params.condition_id,
            indexSets,
          ],
        });

        const receipt = await sendAndConfirmTx(transaction as any);

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
    [account, sendAndConfirmTx, onSuccess]
  );

  return {
    redeemPosition,
    status,
  };
}
