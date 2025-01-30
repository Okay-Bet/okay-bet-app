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
  {
    type: "function",
    name: "conditionalTokens",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

const ERC1155_ABI = [
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { type: "address", name: "operator" },
      { type: "bool", name: "approved" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
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
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "approved" | "failed"
  >("pending");

  const handleTokenApproval = async (marketAddress: string) => {
    try {
      const marketContract = getContract({
        client,
        chain: base,
        address: marketAddress,
        abi: MARKET_ABI,
      });

      // Get the conditional tokens address from the market contract
      const conditionalTokensAddress = await readContract({
        contract: marketContract,
        method: "conditionalTokens",
        params: [],
      });

      console.log("Preparing ERC1155 approval:", {
        conditionalTokensAddress,
        marketAddress,
      });

      const tokenContract = getContract({
        client,
        chain: base,
        address: conditionalTokensAddress,
        abi: ERC1155_ABI,
      });

      const approvalTx = prepareContractCall({
        contract: tokenContract,
        method: "function setApprovalForAll(address operator, bool approved)",
        params: [marketAddress, true],
      });

      const receipt = await sendAndConfirmTx(approvalTx);
      console.log("ERC1155 approval confirmed:", receipt.transactionHash);
      setApprovalStatus("approved");
      return receipt;
    } catch (error) {
      console.error("ERC1155 approval failed:", error);
      setApprovalStatus("failed");
      throw error;
    }
  };

  const getMarketContract = (marketAddress: string) => {
    return getContract({
      client,
      chain: base,
      address: marketAddress,
      abi: MARKET_ABI,
    });
  };

  const calculateSellParams = async (params: SellPositionParams) => {
    const contract = getMarketContract(params.token_id);
    // Change outcomeIndex to use 0 for yes tokens instead of 1
    const outcomeIndex = BigInt(params.is_yes_token ? 0 : 1);

    // Calculate initial sell amount based on our full balance
    const desiredTokensToSell = BigInt(params.amount);

    // Get the AMM's maximum allowed tokens for this trade first
    const maxOutcomeTokensToSell = desiredTokensToSell; // Use full amount as max

    // Calculate return amount using the contract's calcSellAmount
    const sellAmountInCollateral = await readContract({
      contract,
      method: "calcSellAmount",
      params: [maxOutcomeTokensToSell, outcomeIndex],
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
      await handleTokenApproval(params.token_id);

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
