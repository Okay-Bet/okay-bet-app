// hooks/useCreateBetForm.ts
import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";
import { useValidateAddress } from "./useValidateAddress";
import { resolveUserAddress } from "./useResolveUserAddress";
import { createBet } from "@/generated/betFactory";

export const useCreateBetForm = (contract: any) => {
  const [better1, setBetter1] = useState<string>("");
  const [better2, setBetter2] = useState<string>("");
  const [decider, setDecider] = useState<string>("");
  const [better1Type, setBetter1Type] = useState<string>("wallet"); // wallet, email, phone
  const [better2Type, setBetter2Type] = useState<string>("wallet"); // wallet, email, phone
  const [deciderType, setDeciderType] = useState<string>("wallet"); // wallet, email, phone
  const [wagerUSD, setWagerUSD] = useState<string>("");
  const [conditions, setConditions] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const { isValid: better1Valid, isLoading: better1Loading } = useValidateAddress(better1, better1Type);
  const { isValid: better2Valid, isLoading: better2Loading } = useValidateAddress(better2, better2Type);
  const { isValid: deciderValid, isLoading: deciderLoading } = useValidateAddress(decider, deciderType);

  const ethToUsdRate = useFetchEthToUsdRate();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();

  useEffect(() => {
    if (account) {
      setBetter1(account.address);
    }
  }, [account]);

  const convertUsdToEth = (usdAmount: string): string => {
    if (!usdAmount || !ethToUsdRate) return "0";
    const ethAmount = parseFloat(usdAmount) / ethToUsdRate;
    return ethAmount.toFixed(6); // Limit to 6 decimal places
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const resolvedBetter1 = await resolveUserAddress(better1, better1Type);
      const resolvedBetter2 = await resolveUserAddress(better2, better2Type);
      const resolvedDecider = await resolveUserAddress(decider, deciderType);

      const wagerInEth = (parseFloat(wagerUSD) / ethToUsdRate).toFixed(18);
      const wagerInWei = ethers.utils.parseEther(wagerInEth);

      const transaction = createBet({
        contract,
        better1: resolvedBetter1,
        better2: resolvedBetter2,
        decider: resolvedDecider,
        wager: BigInt(wagerInWei.toString()),
        conditions,
      });

      await sendTransaction(transaction);
      setMessage("Bet created successfully!");
      setIsAlertOpen(true);

      // Reset form fields and close form
      setBetter1(account?.address || "");
      setBetter2("");
      setDecider("");
      setWagerUSD("");
      setConditions("");
      setIsFormVisible(false);
    } catch (error: any) {
      console.error("Error creating bet:", error);
      setMessage(`Error creating bet: ${error.message}`);
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = better1Valid && better2Valid && deciderValid;

  return {
    better1,
    setBetter1,
    better2,
    setBetter2,
    decider,
    setDecider,
    better1Type,
    setBetter1Type,
    better2Type,
    setBetter2Type,
    deciderType,
    setDeciderType,
    wagerUSD,
    setWagerUSD,
    conditions,
    setConditions,
    message,
    isLoading,
    isFormVisible,
    setIsFormVisible,
    isAlertOpen,
    setIsAlertOpen,
    handleSubmit,
    better1Valid,
    better2Valid,
    deciderValid,
    ethToUsdRate,
    convertUsdToEth,
    better1Loading,
    better2Loading,
    deciderLoading,
    canSubmit,
  };
};
