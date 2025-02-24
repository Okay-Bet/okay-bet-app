"use client";
import React, { useState } from "react";
import { useAccount, useContract } from "@starknet-react/core";
import { Contract, uint256 } from "starknet";

export default function InvestComponent() {
  const { address } = useAccount();
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

//   const { contract } = useContract({
//     address: process.env.NEXT_PUBLIC_INVESTMENT_CONTRACT as string,
//     abi: [
//       {
//         name: "deposit",
//         type: "function",
//         inputs: [{ name: "amount", type: "Uint256" }],
//         outputs: [],
//       },
//     ],
//   });

  const handleDeposit = async () => {
    // if (!contract || !address || !amount) return;

    // try {
    //   setLoading(true);
    //   const amountUint256 = uint256.bnToUint256(amount);
    //   const tx = await contract.invoke("deposit", [amountUint256]);
    //   await tx.wait();
    //   setAmount("");
    // } catch (error) {
    //   console.error("Deposit failed:", error);
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 m-4">
      <h2 className="text-3xl font-bold text-center text-black mb-8">Invest Your Funds</h2>

      {address ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black">
              Amount to Deposit
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full border border-gray-300 text-black rounded-md shadow-sm p-2"
              placeholder="Enter amount"
            />
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className={`w-full bg-secondary text-black px-6 py-2 rounded-lg
              ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              }`}
          >
            {loading ? "Processing..." : "Deposit"}
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          Please connect your wallet to invest
        </div>
      )}
    </div>
  );
}
