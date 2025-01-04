import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getAcrossClient } from "../../services/across/client";
import {
  AGENT_WALLET_ADDRESS,
  sleep,
  prepareBridgeTransaction,
} from "../../services/transaction";

const CHAIN_CONFIG = {
  stablecoins: {
    USDC: {
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      decimals: 6,
      symbol: "USDC",
    },
    "USDC.e": {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      decimals: 6,
      symbol: "USDC.e",
    },
    USDT: {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      decimals: 6,
      symbol: "USDT",
    },
    DAI: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      decimals: 18,
      symbol: "DAI",
    },
  },
};

export type BridgeStep =
  | {
      step: "approval";
      status: "pending" | "success" | "failed";
      txHash?: string;
    }
  | {
      step: "bridging";
      status: "pending" | "success" | "failed";
      txHash?: string;
    };

const normalizeAmount = (amount: string, decimals: number): string => {
  const parsedAmount = parseFloat(amount) / Math.pow(10, decimals);
  return parsedAmount.toFixed(6);
};

export const useBridgeTransfer = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

  const sendUsdcTransfer = useCallback(
    async (rawAmount: string): Promise<{ transactionHash: string }> => {
      if (!account) throw new Error("Wallet not connected");

      try {
        const client = getAcrossClient();
        const routes = await client.getAvailableRoutes();

        const stablecoinRoutes = routes.filter((route) => {
          const isOptimismToPolygon =
            route.originChainId === 10 && route.destinationChainId === 137;
          const isStablecoin = ["USDC", "USDC.e", "USDT", "DAI"].includes(
            route.inputTokenSymbol
          );
          return isOptimismToPolygon && isStablecoin;
        });

        console.log(
          "Available stablecoin routes:",
          stablecoinRoutes.map((route) => ({
            symbol: route.inputTokenSymbol,
            inputToken: route.inputToken,
            outputToken: route.outputToken,
          }))
        );

        const preferredRoute =
          stablecoinRoutes.find(
            (route) => route.inputTokenSymbol === "USDC.e"
          ) ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "USDT") ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "DAI");

        if (!preferredRoute) {
          throw new Error("No available stablecoin bridge routes");
        }

        const tokenConfig =
          CHAIN_CONFIG.stablecoins[
            preferredRoute.inputTokenSymbol as keyof typeof CHAIN_CONFIG.stablecoins
          ];
        console.log(
          `Bridging ${normalizeAmount(rawAmount, tokenConfig.decimals)} ${
            tokenConfig.symbol
          }`
        );

        const quote = await client.getQuote({
          route: {
            originChainId: preferredRoute.originChainId,
            destinationChainId: preferredRoute.destinationChainId,
            inputToken: preferredRoute.inputToken,
            outputToken: preferredRoute.outputToken,
          },
          inputAmount: BigInt(rawAmount),
          recipient: AGENT_WALLET_ADDRESS,
        });

        if (!quote || !quote.deposit) {
          throw new Error(
            `Failed to get quote for ${preferredRoute.inputTokenSymbol} bridge`
          );
        }

        // Log the deposit data to verify we have what we need
        console.log("Quote deposit data:", {
          target: quote.deposit.target,
          callData: quote.deposit.callData,
          value: quote.deposit.value,
        });

        if (!quote.deposit.target || !quote.deposit.callData) {
          throw new Error("Invalid quote data received from Across");
        }

        console.log(
          `Quote received for ${normalizeAmount(
            rawAmount,
            tokenConfig.decimals
          )} ${tokenConfig.symbol}`
        );

        // Prepare the bridge transaction with the required data from quote
        const transaction = prepareBridgeTransaction(
          quote.deposit.target, // This is the spokePoolAddress
          quote.deposit.callData, // This is the encoded call data
          BigInt(quote.deposit.value || 0) // This is the ETH value to send
        );

        return new Promise((resolve, reject) => {
          sendTransaction(transaction, {
            onSuccess: async (result) => {
              try {
                console.log(
                  "Bridge transaction sent, waiting for confirmation..."
                );
                setBridgeStep({
                  step: "bridging",
                  status: "pending",
                  txHash: result.transactionHash,
                });

                await sleep(15000); // Wait for confirmation
                console.log("Bridge transaction confirmed");

                setBridgeStep({
                  step: "bridging",
                  status: "success",
                  txHash: result.transactionHash,
                });

                resolve(result);
              } catch (error) {
                reject(error);
              }
            },
            onError: (error) => {
              console.error("Bridge transaction failed:", error);
              setBridgeStep({
                ...bridgeStep,
                status: "failed",
              });
              reject(error);
            },
          });
        });
      } catch (error) {
        console.error("Bridge preparation failed:", error);
        setBridgeStep({
          ...bridgeStep,
          status: "failed",
        });
        throw error;
      }
    },
    [account, sendTransaction]
  );

  return {
    sendUsdcTransfer,
    bridgeStep,
  };
};
