import {
  useBalance,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { Abi, cairo } from "starknet";

const USDC_CONTRACT =
  "0x042838ee5b65fe9c5b24afd1f650f7e40564cc2d586a1d9ca8c4120456707d91";

const PARLAY_CONTRACT =
  "0x0574572d8a7e6d14eadbb934ea2bf45f61e6ddb0e4520daed63429129a5339b4";

const usdcAbi = [
  {
    members: [
      { name: "low", type: "felt" },
      { name: "high", type: "felt" },
    ],
    name: "Uint256",
    type: "struct",
  },
  {
    inputs: [
      { name: "spender", type: "felt" },
      { name: "amount", type: "Uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "felt" }],
    type: "function",
  },
] as const satisfies Abi;

const parlayAbi = [
  {
    members: [
      { name: "low", type: "felt" },
      { name: "high", type: "felt" },
    ],
    name: "Uint256",
    type: "struct",
  },
  {
    inputs: [{ name: "value", type: "Uint256" }],
    name: "invest",
    type: "function",
  },
] as const satisfies Abi;

export const useInvestment = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInvestment, setUserInvestment] = useState("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address } = useAccount();

  const {
    data: usdcBalance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
    token: USDC_CONTRACT,
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

  const { send: sendTransaction, error: transferError } = useSendTransaction({
    calls: [],
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
      if (!usdcContract || !parlayContract) {
        setErrorMessage("Contracts not initialized");
        return;
      }

      setLoading(true);

      // Convert amount to base units (6 decimals for USDC)
      const baseUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
      console.log("Amount in base units:", baseUnits.toString());

      // Create the amount struct as expected by Cairo
      const amountStruct = {
        low: baseUnits,
        high: 0n,
      };

      // Create calls using contract.populate()
      const approveCall = usdcContract.populate("approve", [
        PARLAY_CONTRACT,
        amountStruct,
      ]);

      const investCall = parlayContract.populate("invest", [amountStruct]);

      console.log("Sending transactions...", [approveCall, investCall]);

      // Send the transaction
      const response = await sendTransaction({
        calls: [approveCall, investCall],
      });

      console.log("Transaction response:", response);
      setAmount("");
      setErrorMessage("Transaction submitted successfully!");
    } catch (error) {
      console.error("Investment failed:", error);
      setErrorMessage("Investment failed. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Add debug logging for contract states
  console.log("Contract states:", {
    usdcContract: !!usdcContract,
    parlayContract: !!parlayContract,
    address,
    balance: usdcBalance?.formatted,
    hasError: !!errorMessage,
  });

  return {
    address,
    amount,
    setAmount,
    loading,
    handleDeposit,
    isExpanded,
    setIsExpanded,
    userInvestment,
    usdcBalance,
    balanceError,
    balanceLoading,
    transferError,
    errorMessage,
  };
};
