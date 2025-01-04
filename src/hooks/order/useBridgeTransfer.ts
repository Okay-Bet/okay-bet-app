import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { optimism, polygon } from "viem/chains";
import {
  getAcrossClient,
  formatInputAmount,
} from "../../services/across/client";
import { AGENT_WALLET_ADDRESS } from "../../services/transaction";

const CHAIN_CONFIG = {
  optimism: {
    chainId: optimism.id,
    stablecoins: {
      "USDC.e": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    },
  },
  polygon: {
    chainId: polygon.id,
    stablecoins: {
      "USDC.e": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    },
  },
} as const;

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

export const useBridgeTransfer = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

  const sendUsdcTransfer = useCallback(
    async (amount: string): Promise<{ transactionHash: string }> => {
      if (!account) throw new Error("Wallet not connected");

      try {
        const client = getAcrossClient();

        // Get all available routes
        const routes = await client.getAvailableRoutes();

        // Find all available stablecoin routes from Optimism to Polygon
        const stablecoinRoutes = routes.filter((route) => {
          const isOptimismToPolygon =
            route.originChainId === CHAIN_CONFIG.optimism.chainId &&
            route.destinationChainId === CHAIN_CONFIG.polygon.chainId;

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

        // Prioritize stable routes in this order: USDC.e > USDT > DAI
        const preferredRoute =
          stablecoinRoutes.find(
            (route) => route.inputTokenSymbol === "USDC.e"
          ) ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "USDT") ||
          stablecoinRoutes.find((route) => route.inputTokenSymbol === "DAI");

        if (!preferredRoute) {
          throw new Error(
            "No available stablecoin bridge routes. Consider implementing swap+bridge flow."
          );
        }

        console.log("Selected route:", {
          token: preferredRoute.inputTokenSymbol,
          from: preferredRoute.originChainId,
          to: preferredRoute.destinationChainId,
        });

        // Format amount properly
        const formattedAmount = formatInputAmount(amount);
        console.log("Formatted amount:", formattedAmount.toString());

        // Get quote using the found route
        const quote = await client.getQuote({
          route: {
            originChainId: preferredRoute.originChainId,
            destinationChainId: preferredRoute.destinationChainId,
            inputToken: preferredRoute.inputToken,
            outputToken: preferredRoute.outputToken,
          },
          inputAmount: formattedAmount,
          recipient: AGENT_WALLET_ADDRESS,
        });

        if (!quote || !quote.deposit) {
          throw new Error(
            `Failed to get quote for ${preferredRoute.inputTokenSymbol} bridge`
          );
        }

        console.log("Quote received for", preferredRoute.inputTokenSymbol);

        // Execute the bridge transaction
        setBridgeStep({ step: "bridging", status: "pending" });

        const bridgeTx = {
          to: quote.deposit.target,
          data: `${quote.deposit.callData}1dc0def001`,
          value: BigInt(quote.deposit.value || 0),
        };

        const result = await sendTransaction(bridgeTx);
        const txHash = result.transactionHash;

        setBridgeStep({
          step: "bridging",
          status: "success",
          txHash,
        });

        return { transactionHash: txHash };
      } catch (error) {
        console.error("Bridge transfer failed:", error);
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
