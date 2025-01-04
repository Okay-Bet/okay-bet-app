// src/services/across/client.ts
import { createAcrossClient } from "@across-protocol/app-sdk";
import { optimism, polygon } from "viem/chains";
import { generateBridgeDepositData, type DepositParams } from './bridge';

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

export const prepareDepositCalldata = async (deposit: any, depositor: string): Promise<string> => {
  const depositParams: DepositParams = {
    depositor,
    recipient: deposit.recipient,
    inputToken: deposit.inputToken,
    outputToken: deposit.outputToken,
    inputAmount: deposit.inputAmount,
    outputAmount: deposit.outputAmount,
    destinationChainId: deposit.destinationChainId,
    exclusiveRelayer: deposit.exclusiveRelayer,
    quoteTimestamp: deposit.quoteTimestamp,
    exclusivityDeadline: deposit.exclusivityDeadline,
    message: deposit.message || "0x"
  };

  return generateBridgeDepositData(depositParams, deposit.spokePoolAddress);
};

export const formatInputAmount = (amount: string) => {
  return BigInt(amount) * BigInt(1e12);
};