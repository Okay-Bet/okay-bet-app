import { useState } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../app/client";
import Big from "big.js";
import { newtonRaphson } from "@fvictorio/newton-raphson-method";

const MARKET_ABI = [
  {
    type: "function",
    name: "sell",
    inputs: [
      { type: "uint256", name: "returnAmount" },
      { type: "uint256", name: "outcomeIndex" },
      { type: "uint256", name: "maxOutcomeTokensToSell" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calcSellAmount",
    inputs: [
      { type: "uint256", name: "returnAmount" },
      { type: "uint256", name: "outcomeIndex" },
    ],
    outputs: [{ type: "uint256", name: "outcomeTokenSellAmount" }],
    stateMutability: "view",
  },
] as const;

interface SellPositionParams {
  token_id: string;
  price: number;
  amount: number;
  is_yes_token: boolean;
}

const calcSellAmountInCollateral = (
  sharesToSell: bigint,
  holdings: bigint,
  otherHoldings: bigint[],
  fee: number
): bigint | null => {
  Big.DP = 90;

  const sharesToSellBig = new Big(sharesToSell.toString());
  const holdingsBig = new Big(holdings.toString());
  const otherHoldingsBig = otherHoldings.map((x) => new Big(x.toString()));

  const f = (r: Big) => {
    const R = r.div(1 - fee);
    const firstTerm = otherHoldingsBig
      .map((h) => h.minus(R))
      .reduce((a, b) => a.mul(b));
    const secondTerm = holdingsBig.plus(sharesToSellBig).minus(R);
    const thirdTerm = otherHoldingsBig.reduce((a, b) => a.mul(b), holdingsBig);
    return firstTerm.mul(secondTerm).minus(thirdTerm);
  };

  const r = newtonRaphson(f, 0, { maxIterations: 100 });
  if (r) {
    return BigInt(r.toFixed(0));
  }
  return null;
};

export function useSellPosition() {
  const account = useActiveAccount();
  const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMarketContract = (marketAddress: string) => {
    return getContract({
      client,
      chain: base,
      address: marketAddress,
      abi: MARKET_ABI,
    });
  };

  const USDC_DECIMALS = 1_000_000n; // 6 decimals for USDC

  const calculateSellParams = async (params: SellPositionParams) => {
    const contract = getMarketContract(params.token_id);
    const outcomeIndex = BigInt(params.is_yes_token ? 1 : 2);

    // Calculate initial sell amount based on our full balance
    const desiredTokensToSell = BigInt(params.amount);
    const holdings = BigInt(2_000_000);
    const otherHoldings = [BigInt(2_000_000)];
    const fee = 0.1;

    const sellAmountInCollateral = calcSellAmountInCollateral(
      desiredTokensToSell,
      holdings,
      otherHoldings,
      fee
    );

    if (!sellAmountInCollateral) {
      throw new Error("Failed to calculate sell amount");
    }

    // Get the AMM's maximum allowed tokens for this trade
    const maxOutcomeTokensToSell = await readContract({
      contract,
      method: "calcSellAmount",
      params: [sellAmountInCollateral, outcomeIndex],
    });

    console.log("Sell calculation results:", {
      desiredTokensToSell: {
        raw: desiredTokensToSell.toString(),
        type: "Total Tokens Available to Sell",
      },
      maxOutcomeTokensToSell: {
        raw: maxOutcomeTokensToSell.toString(),
        type: "AMM Maximum Allowed",
      },
      sellAmountInCollateral: {
        raw: sellAmountInCollateral.toString(),
        inUSDC: Number(sellAmountInCollateral) / 1e6,
        type: "Expected USDC Return",
      },
      outcomeIndex: outcomeIndex.toString(),
    });

    // Use the AMM's maximum allowed amount
    return {
      returnAmount: sellAmountInCollateral,
      outcomeIndex,
      maxOutcomeTokensToSell,
    };
  };

  const sellPosition = async (params: SellPositionParams) => {
    if (!account?.address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      // Get contract instance using the token_id as the market address
      const marketContract = getContract({
        client,
        chain: base,
        address: params.token_id,
      });

      const calculatedParams = await calculateSellParams(params);

      console.log("Preparing transaction with BigInt params:", {
        returnAmount: calculatedParams.returnAmount.toString(),
        outcomeIndex: calculatedParams.outcomeIndex.toString(),
        maxOutcomeTokensToSell:
          calculatedParams.maxOutcomeTokensToSell.toString(),
      });

      const transaction = prepareContractCall({
        contract: marketContract,
        method:
          "function sell(uint256 returnAmount, uint256 outcomeIndex, uint256 maxOutcomeTokensToSell)",
        params: [
          BigInt(calculatedParams.returnAmount),
          BigInt(calculatedParams.outcomeIndex),
          BigInt(calculatedParams.maxOutcomeTokensToSell),
        ],
      });

      // Add this before sendAndConfirmTx
      const txData = await transaction.data();
      console.log("Transaction data comparison:", {
        ourTxData: txData,
        workingTxData:
          "0xd3c9727c0000000000000000000000000000000000000000000000000000000000136f05000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000001c9ad8",
        doTheyMatch:
          txData ===
          "0xd3c9727c0000000000000000000000000000000000000000000000000000000000136f05000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000001c9ad8",
      });
      const receipt = await sendAndConfirmTx(transaction);
      console.log("Transaction confirmed:", receipt?.transactionHash);

      return receipt;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sell position";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sellPosition,
    loading,
    error,
  };
}
