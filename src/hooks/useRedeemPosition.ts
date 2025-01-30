import { useCallback } from "react";
import {
  useActiveAccount,
  useSendAndConfirmTransaction,
  useReadContract,
} from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";

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
  token_id: string;
  is_yes_token: boolean;
  condition_id: `0x${string}`;
  parent_collection_id: `0x${string}`;
}

// Constants
const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

export function useRedeemPosition() {
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();

  const redeemPosition = useCallback(
    async (params: RedeemPositionParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      try {
        console.log("getting market contrect");
        const marketContract = getContract({
          client,
          chain: base,
          address: params.token_id,
          abi: MARKET_CONTRACT_ABI,
        });
        console.log("got market contract");
        const { data: conditionalTokensAddress, isPending } = useReadContract({
          contract: marketContract,
          method: "function conditionalTokens() view returns (address)",
          params: [],
        });

        console.log("ConditionalTokens contract address:", conditionalTokensAddress);

        const conditionalTokensContract = getContract({
          client,
          chain: base,
          address: conditionalTokensAddress,
          abi: CONDITIONAL_TOKEN_ABI,
        });

        const indexSet = BigInt(params.is_yes_token ? 1 : 2);
        if (indexSet <= BigInt(0)) {
          throw new Error("Invalid index set");
        }

        const indexSets = [indexSet];

        console.log("Preparing redeem transaction with params:", {
          collateralToken: USDC_ADDRESS,
          parentCollectionId: params.parent_collection_id || "0x0000000000000000000000000000000000000000000000000000000000000000",
          conditionId: params.condition_id,
          indexSets: indexSets.map(i => i.toString()),
        });

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

        console.log("Sending redeem transaction:", transaction);
        const receipt = await sendAndConfirmTx(transaction);
        console.log("Redeem transaction confirmed:", receipt.transactionHash);

        return receipt;
      } catch (error) {
        console.error("Redeem process failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Transaction failed";
        throw new Error(errorMessage);
      }
    },
    [account, sendAndConfirmTx]
  );

  return {
    redeemPosition,
  };
}
