import { useState } from "react";
import { useAccount, useContract } from "@starknet-react/core";
import { uint256 } from "starknet";

export const useInvestment = () => {
  const { address } = useAccount();
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [userInvestment, setUserInvestment] = useState<string>("0"); // Mock data for now

  const { contract } = useContract({
    address: process.env.NEXT_PUBLIC_INVESTMENT_CONTRACT as string,
    abi: [
      {
        name: "deposit",
        type: "function",
        inputs: [{ name: "amount", type: "Uint256" }],
        outputs: [],
      },
    ],
  });

  const handleDeposit = async () => {
    if (!contract || !address || !amount) return;

    try {
      setLoading(true);
      const amountUint256 = uint256.bnToUint256(amount);
      const tx = await contract.invoke("deposit", [amountUint256]);
      await tx.wait();
      setAmount("");
      // Update user investment after successful deposit
      setUserInvestment(prev => (Number(prev) + Number(amount)).toString());
    } catch (error) {
      console.error("Deposit failed:", error);
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
    userInvestment
  };
};