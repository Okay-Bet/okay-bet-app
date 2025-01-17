// src/hooks/order/useOrder.ts
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { OrderStatus, OrderRequest } from "../../components/types";
import { useOrderValidation } from "./useOrderValidation";
import { useBridgeTransfer } from "./useBridgeTransfer";
import { submitDelegatedOrder } from "../../services/transaction";
import { useLimitlessOrder } from "./limitless/useLimitlessOrder";

type Provider = "LIMITLESS" | "POLYMARKET";

export const useOrder = () => {
  // Initialize with idle state explicitly
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();
  const { validateOrder } = useOrderValidation();
  const { sendUsdcTransfer, bridgeStep } = useBridgeTransfer();
  // const { submitOrder: submitPolyOrder } = useBridgeTransfer();
  const { submitOrder: submitLimitlessOrder } = useLimitlessOrder();

  const provider: Provider = "LIMITLESS"; // fix this when we actually support new markets

  const submitOrder = async (orderRequest: OrderRequest) => {
    console.log("useOrder: Starting order submission");

    if (!account) {
      setStatus({ state: "error", error: "Wallet not connected" });
      return;
    }

    try {
      if (provider === "LIMITLESS") {
        console.log("useOrder: Proceeding with Limitless order flow");
        setStatus({ state: "preparing_transfer" });
        if (!submitLimitlessOrder) {
          console.error("useOrder: submitLimitlessOrder is not defined");
          throw new Error("Order submission method not available");
        }
        const result = await submitLimitlessOrder(orderRequest);
        console.log("useOrder: Limitless order submitted:", result);
        setStatus({ state: "complete", result });
        return result;
      } else {
      }
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
