// src/services/across/client.ts
import { createAcrossClient } from "@across-protocol/app-sdk";
import { optimism, polygon } from "viem/chains";

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

export const formatInputAmount = (amount: string) => {
  return BigInt(amount) * BigInt(1e12);
};