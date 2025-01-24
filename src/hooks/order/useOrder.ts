// useOrder.ts
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { OrderStatus, OrderRequest, BridgeStep } from "../../components/types";
import { useLimitlessNativeOrder } from "./limitless/useLimitlessNativeOrder";

type Provider = "LIMITLESS" | "POLYMARKET";

export const useOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useActiveAccount();

  // Get both order handlers and approval status
  const {
    submitOrder: submitNativeOrder,
    approvalStep, // Important: We now destructure approvalStep
  } = useLimitlessNativeOrder();

  // Default to native limitless implementation
  const provider: Provider = "LIMITLESS";

  const submitOrder = async (orderRequest: OrderRequest) => {
    console.log("useOrder: Starting order submission");

    if (!account) {
      setStatus({ state: "error", error: "Wallet not connected" });
      return;
    }

    try {
      switch (provider) {
        case "LIMITLESS":
          console.log("useOrder: Proceeding with native Limitless order flow");
          setStatus({ state: "preparing_transfer" });
          const nativeResult = await submitNativeOrder(orderRequest);
          setStatus({ state: "complete", result: nativeResult });
          return nativeResult;

        case "POLYMARKET":
          throw new Error("Polymarket integration not implemented");

        default:
          throw new Error("Unknown provider");
      }
    } catch (err) {
      console.error("Order error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setStatus({ state: "error", error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const isLoading = ["preparing_transfer", "submitting_order"].includes(
    status.state
  );

  // Return approvalStep in the hook's interface
  return {
    submitOrder,
    status,
    isLoading,
    approvalStep, // Now exposed to consuming components
  };
};
