"use client";
import { useState, useEffect } from "react";
import { cairo, num } from "starknet";
import {
  useContract,
  useAccount,
  useReadContract,
  useSendTransaction,
  useCall,
} from "@starknet-react/core";
import type { Abi } from "starknet";
const CONTRACT_ADDRESS =
  "0x05f2d9ab99f8c3dcb34def80f413173174682caa5ce7e17241e82fdd06db5463";
// Replace this with your actual deployed contract address
const contractABI = [
  {
    name: "get_balance",
    type: "function",
    inputs: [],
    outputs: [{ name: "balance", type: "felt252" }],
    state_mutability: "view",
  },
  {
    name: "increase_balance",
    type: "function",
    inputs: [{ name: "amount", type: "felt252" }],
    outputs: [],
    state_mutability: "external",
  },
] as const satisfies Abi;

export default function ContractButton() {
  const { address: walletAddress } = useAccount();

  // Use starknet-react hooks
  const { contract } = useContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
  });

  // Read contract state with type safety
  const {
    data: balanceData,
    error: balanceError,
    refetch: refetchBalance,
    isPending: isBalanceLoading,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "get_balance",
    args: [],
    watch: true,
  });

  // Transaction hook
  const {
    send,
    isPending: isTransactionPending,
    error: txError,
  } = useSendTransaction({
    calls:
      contract && walletAddress
        ? [contract.populate("increase_balance", [cairo.felt(1)])]
        : undefined,
  });

  const handleInteraction = async () => {
    if (!contract || !walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      await send();
      // After successful transaction, refetch the balance
      await refetchBalance();
    } catch (err) {
      console.error("Transaction error:", err);
    }
  };

  // Simplified balance formatting
  const formattedBalance = balanceData ? balanceData.balance.toString() : '0';
  const isLoading = isBalanceLoading || isTransactionPending;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-lg font-heading text-black">
        Current Balance: {formattedBalance}
      </div>

      <button
        onClick={handleInteraction}
        disabled={isLoading || !walletAddress || !contract}
        className={`
            bg-secondary text-font
            px-4 py-2 rounded-lg
            ${
              isLoading || !walletAddress || !contract
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-opacity-90"
            }
            transition-all duration-200
          `}
      >
        {isTransactionPending
          ? "Processing..."
          : isBalanceLoading
          ? "Loading..."
          : "Increase Balance"}
      </button>

      {/* Error displays */}
      {balanceError && (
        <div className="text-red-500 text-sm mt-2">
          Balance Error: {balanceError.message}
        </div>
      )}
      {txError && (
        <div className="text-red-500 text-sm mt-2">
          Transaction Error: {txError.message}
        </div>
      )}

      {/* Debug info */}
      <div className="text-sm text-gray-500 mt-2">
        <div>Contract loaded: {contract ? "Yes" : "No"}</div>
        <div>Wallet connected: {walletAddress ? "Yes" : "No"}</div>
        <div>Balance loading: {isBalanceLoading ? "Yes" : "No"}</div>
        <div>Transaction pending: {isTransactionPending ? "Yes" : "No"}</div>
        <div>Balance type: {balanceData ? typeof balanceData : "null"}</div>
        <div>Raw balance: {formattedBalance}</div>
      </div>
    </div>
  );
}
