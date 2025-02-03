// hooks/limitless/useLimitlessNativeOrder.ts
import { useState, useCallback } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { base } from "thirdweb/chains";
import { OrderRequest, OrderStatus } from "../../../components/types";
import { client } from "../../../app/client";
import { useUSDCApproval } from "../useUSDCApproval";

export const useLimitlessNativeOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const { handleUSDCApproval, approvalStep } = useUSDCApproval();

  const submitOrder = useCallback(
    async (orderRequest: OrderRequest) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setStatus({ state: "preparing_transfer" });

      try {
        // Step 1: USDC Approval
        await handleUSDCApproval(
          orderRequest.tokenId, // Market contract as spender
          orderRequest.amount // Amount in USDC base units
        );

        // Step 2: Execute Market Order
        const marketContract = getContract({
          client,
          chain: base,
          address: orderRequest.tokenId,
        });

        console.log("Preparing market order:", {
          marketAddress: orderRequest.tokenId,
          amount: orderRequest.amount,
          isYesToken: orderRequest.isYesToken,
          estimatedTokens: orderRequest.estimatedTokens,
        });

        const transaction = prepareContractCall({
          contract: marketContract,
          method:
            "function buy(uint256 investmentAmount, uint256 outcomeIndex, uint256 minOutcomeTokensToBuy)",
          params: [
            BigInt(orderRequest.amount),
            BigInt(orderRequest.isYesToken ? 0 : 1),
            BigInt(Math.floor((orderRequest.estimatedTokens || 0) * 0.98)),
          ],
        });

        setStatus({ state: "submitting_order" });

        const receipt = await sendAndConfirmTx(transaction);
        console.log("Market order confirmed:", receipt.transactionHash);

        setStatus({
          state: "complete",
          result: receipt,
        });

        return receipt;
      } catch (error) {
        console.error("Order process failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Transaction failed";
        setStatus({
          state: "error",
          error: errorMessage,
        });
        throw error;
      }
    },
    [account, sendAndConfirmTx, handleUSDCApproval]
  );

  return {
    submitOrder,
    status,
    approvalStep,
  };
};
