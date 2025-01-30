import { useCallback } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
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
] as const;

interface RedeemPositionParams {
  token_id: string;
  is_yes_token: boolean;
  condition_id: `0x${string}`;
}

// Constants
const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const PARENT_COLLECTION_ID =
  "46586342936558472622533862019640626392261451892082962702035323232962338940793";

export function useRedeemPosition() {
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();

  const redeemPosition = useCallback(
    async (params: RedeemPositionParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      try {
        const marketContract = getContract({
          client,
          chain: base,
          address: params.token_id,
          abi: CONDITIONAL_TOKEN_ABI,
        });

        const indexSets = [BigInt(params.is_yes_token ? 1 : 2)];

        console.log("Preparing redeem transaction with params:", {
          collateralToken: USDC_ADDRESS,
          parentCollectionId: PARENT_COLLECTION_ID,
          conditionId: params.condition_id,
          indexSets: indexSets.map((i) => i.toString()),
        });

        const transaction = prepareContractCall({
          contract: marketContract,
          method: "redeemPositions",
          params: [
            USDC_ADDRESS,
            PARENT_COLLECTION_ID,
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
