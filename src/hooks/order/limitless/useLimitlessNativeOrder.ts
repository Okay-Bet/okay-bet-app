// hooks/limitless/useLimitlessNativeOrder.ts
import { useState, useCallback } from "react";
import { useActiveAccount, useSendAndConfirmTransaction, useSignTypedData } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { base } from "thirdweb/chains";
import { OrderRequest, OrderStatus, UnsignedOrderResponse } from "../../../components/types";
import { client } from "../../../app/client";
import { useUSDCApproval } from "../useUSDCApproval";

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://157.245.87.57:8000";

export const useLimitlessNativeOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const { mutateAsync: signTypedData } = useSignTypedData();
  const { handleUSDCApproval, approvalStep } = useUSDCApproval();

  const prepareAndSignOrder = async (orderRequest: OrderRequest) => {
    try {
      // Prepare order
      const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/limitless/orders/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to prepare order: ${response.statusText}`);
      }

      const preparedOrder: UnsignedOrderResponse = await response.json();

      // Sign the order
      const signature = await signTypedData({
        // Define the EIP-712 type data structure for the order
        domain: {
          name: 'Limitless',
          version: '1',
          chainId: 8453, // Base chain ID
          verifyingContract: '0x...' // Limitless contract address
        },
        types: {
          Order: [
            { name: 'salt', type: 'uint256' },
            { name: 'maker', type: 'address' },
            { name: 'taker', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'makerAmount', type: 'uint256' },
            { name: 'takerAmount', type: 'uint256' },
            { name: 'expiration', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'feeRateBps', type: 'uint256' },
            { name: 'side', type: 'uint8' },
          ],
        },
        value: preparedOrder.unsignedOrder.order,
      });

      return {
        signature,
        order: preparedOrder.unsignedOrder.order,
      };
    } catch (error) {
      console.error('Error preparing and signing order:', error);
      throw error;
    }
  };

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
        const { signature, order } = await prepareAndSignOrder(orderRequest);

        // Step 3: Submit the signed order
        const submitResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/limitless/orders/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order,
            signature,
            marketSlug: orderRequest.marketSlug,
          }),
        });

        if (!submitResponse.ok) {
          throw new Error(`Failed to submit order: ${submitResponse.statusText}`);
        }

        setStatus({ state: "complete" });

        // Reset status after 3 seconds
        setTimeout(() => {
          setStatus({ state: "idle" });
        }, 2000);

      } catch (error) {
        console.error("Order process failed:", error);
        setStatus({
          state: "error",
          error: error instanceof Error ? error.message : "Transaction failed",
        });
        throw error;
      }
    },
    [account, handleUSDCApproval]
  );

  return {
    submitOrder,
    status,
    approvalStep,
  };
};
