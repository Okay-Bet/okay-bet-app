import {
  useBalance,
  useContract,
  useSendTransaction,
  useNetwork,
} from "@starknet-react/core";
import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { Abi } from "starknet";

const USDC_CONTRACT =
  "0x042838ee5b65fe9c5b24afd1f650f7e40564cc2d586a1d9ca8c4120456707d91";

const PARLAY_TOKEN_CONTRACT =
  "0x05d2e578458eaea7fc0386edd900beb1c2f81e71d5fb605d02d40e85032d1a88";

const PARLAY_CONTRACT =
  "0x0574572d8a7e6d14eadbb934ea2bf45f61e6ddb0e4520daed63429129a5339b4";

const usdcAbi = [
  {
    type: "function",
    name: "approve",
    state_mutability: "external",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "amount",
        type: "core::integer::u256",
      },
    ],
    outputs: [{ name: "success", type: "felt" }],
  },
] as const satisfies Abi;

const parlayTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    state_mutability: "view",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [{ name: "balance", type: "core::integer::u256" }],
  },
] as const satisfies Abi;

const parlayAbi = [
  {
    type: "function",
    name: "invest",
    state_mutability: "external",
    inputs: [
      {
        name: "value",
        type: "core::integer::u256",
      },
    ],
    outputs: [],
  },
] as const satisfies Abi;

export const useInvestment = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address } = useAccount();
  const { chain } = useNetwork();

  const {
    data: usdcBalance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
    token: USDC_CONTRACT,
    watch: true,
  });

  const {
    data: parlayTokenBalance,
    error: parlayTokenError,
    isLoading: parlayTokenLoading,
  } = useBalance({
    address,
    token: PARLAY_TOKEN_CONTRACT,
    watch: true,
  });

  const { contract: usdcContract } = useContract({
    address: USDC_CONTRACT,
    abi: usdcAbi,
  });

  const { contract: parlayContract } = useContract({
    address: PARLAY_CONTRACT,
    abi: parlayAbi,
  });

  // Fix the baseUnits calculation
  const baseUnits = amount
    ? BigInt(Math.floor(parseFloat(amount) * 1_000_000_000_000_000_000)) // USDC has 6 decimals
    : 0n;

  const { send, error: txError } = useSendTransaction({
    calls:
      usdcContract && parlayContract && address && amount
        ? [
            usdcContract.populate("approve", [
              PARLAY_CONTRACT,
              { low: baseUnits, high: 0n },
            ]),
            parlayContract.populate("invest", [{ low: baseUnits, high: 0n }]),
          ]
        : undefined,
  });

  const validateInputs = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setErrorMessage("Please enter a valid amount");
      return false;
    }

    if (
      !usdcBalance ||
      parseFloat(amount) > parseFloat(usdcBalance.formatted)
    ) {
      setErrorMessage("Insufficient USDC balance");
      return false;
    }

    return true;
  };

  const handleDeposit = async () => {
    console.log("Attempting deposit with amount:", amount);
    setErrorMessage(null);

    try {
      if (!validateInputs()) return;
      if (!usdcContract || !parlayContract || !address) {
        setErrorMessage("Contracts not initialized or wallet not connected");
        return;
      }
      if (!usdcContract?.address || !parlayContract?.address) {
        setErrorMessage("Contract addresses are invalid or not deployed");
        return;
      }

      setLoading(true);
      console.log("Amount in base units:", baseUnits.toString());

      await send();

      setAmount("");
      setErrorMessage("Transaction submitted successfully!");
    } catch (error) {
      console.error("Investment failed:", error);
      setErrorMessage(
        `Investment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    address,
    amount,
    setAmount,
    loading,
    handleDeposit,
    isExpanded,
    setIsExpanded,
    parlayTokenBalance, 
    parlayTokenError,
    parlayTokenLoading,
    usdcBalance,
    balanceError,
    balanceLoading,
    errorMessage,
  };
};
