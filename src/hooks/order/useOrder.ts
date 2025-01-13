// src/hooks/order/useOrder.ts
import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { OrderStatus, OrderRequest } from '../../components/types';
import { useOrderValidation } from './useOrderValidation';
import { useBridgeTransfer } from './useBridgeTransfer';
import { submitDelegatedOrder } from '../../services/transaction';

type Provider = "LIMITLESS" | "POLYMARKET";

export const useOrder = () => {
  // Initialize with idle state explicitly
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();
  const { validateOrder } = useOrderValidation();
  const { sendUsdcTransfer, bridgeStep } = useBridgeTransfer();

  const provider: Provider = "LIMITLESS"; // fix this when we actually support new markets

  const submitOrder = async (orderRequest: OrderRequest) => {
    if (!account) {
      setStatus({ state: "error", error: "Wallet not connected" });
      return;
    }

    try {
      // Step 1: Validate Order
      if (provider === "POLYMARKET") {
        setStatus({ state: "validating" });
        const validationData = await validateOrder(orderRequest);
        setStatus({ state: "validated", data: validationData });
      }

      // Step 2: Bridge USDC from Optimism to Polygon
      setStatus({ state: "preparing_transfer" });
      const orderAmount = orderRequest.amount.toString();

      // Watch bridge steps and update order status accordingly
      if (bridgeStep?.step === "approval") {
        setStatus({ state: "awaiting_signature" });
      }

      const txResult = await sendUsdcTransfer(orderAmount);

      setStatus({
        state: "confirming_transfer",
        txHash: txResult.transactionHash,
      });

      // Step 3: Submit Delegated Order
      setStatus({ state: "submitting_order" });
      const orderData = {
        user_address: account?.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price,
        amount: orderAmount,
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken,
        usdc_transaction_hash: txResult.transactionHash,
      };

      const result = await submitDelegatedOrder(orderData);

      setStatus({ state: "complete", result });
      return result;
    } catch (err) {
      console.error("Order error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setStatus({ state: "error", error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Only consider active processing states as loading
  const isLoading = [
    "preparing_transfer",
    "awaiting_signature",
    "confirming_transfer",
    "submitting_order",
  ].includes(status.state);

  return {
    submitOrder,
    status,
    bridgeStep,
    isLoading,
  };
};
