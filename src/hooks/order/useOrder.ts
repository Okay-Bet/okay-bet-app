// src/hooks/order/useOrder.ts
import { useState } from "react";
import { OrderStatus, OrderRequest } from "../../components/types";

export const useOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: "idle" });

  // Simplified approvalStep
  const approvalStep = {
    status: "none" as const,
    isApproved: false
  };

  // Simplified submitOrder that just logs
  const submitOrder = async (orderRequest: OrderRequest) => {
    console.log("Order submission temporarily disabled:", orderRequest);
    

    setStatus({ 
      state: "error", 
      error: "Limitless orders are temporarily unavailable" 
    });
    throw new Error("Limitless orders are temporarily unavailable");
  };

  // Simplified loading state
  const isLoading = false;

  return {
    submitOrder,
    status,
    isLoading,
    approvalStep,
  };
};