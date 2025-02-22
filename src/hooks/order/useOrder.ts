// useOrder.ts
import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { OrderStatus, OrderRequest, BridgeStep } from "../../components/types";
// import { useLimitlessNativeOrder } from "./limitless/useLimitlessNativeOrder";

type Provider = "LIMITLESS" | "POLYMARKET" | "STARKNET";

export const useOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });
  const account = useAccount();

  const approvalStep: BridgeStep = {
    type: "approval",
    status: "idle",
  };

  // Will be replaced with Starknet order handling
  // const {
  //   submitOrder: submitNativeOrder,
  //   approvalStep,
  // } = useLimitlessNativeOrder();

  // Default to Starknet implementation
  const provider: Provider = "STARKNET";

  const submitOrder = async (orderRequest: OrderRequest) => {
    console.log("useOrder: Starting order submission");

    if (!account) {
      setStatus({ state: "error", error: "Wallet not connected" });
      return;
    }

    try {
      switch (provider) {
        case "STARKNET":
          setStatus({ state: "preparing_transfer" });
          // TODO: Implement Starknet order submission
          throw new Error("Starknet order submission not yet implemented");


        // case "POLYMARKET":
        //   throw new Error("Polymarket integration not implemented");

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

  return {
    submitOrder,
    status,
    isLoading,
    approvalStep, 
  };
};
