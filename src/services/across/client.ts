// src/services/across/client.ts
import { createAcrossClient } from "@across-protocol/app-sdk";
import { optimism, polygon } from "viem/chains";

// We'll use a singleton pattern for the client
let acrossClient: ReturnType<typeof createAcrossClient> | null = null;

export const getAcrossClient = () => {
  if (!acrossClient) {
    acrossClient = createAcrossClient({
      integratorId: "0xdead", 
      chains: [optimism, polygon], 
    });
  }
  return acrossClient;
};

// Helper to format amounts for Across SDK
export const formatInputAmount = (amount: string) => {
  // Convert from USDC's 6 decimals to wei (18 decimals)
  return BigInt(amount) * BigInt(1e12);
};