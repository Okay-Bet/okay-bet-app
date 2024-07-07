import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { resolveAddress } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import { client } from "@/app/client";
import { createBet } from "../generated/betFactory";
import { getUserWalletAddressByEmail, getUserWalletAddressByPhone } from "@/services/userService";

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
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const [better1Valid, setBetter1Valid] = useState<boolean>(false);
  const [better2Valid, setBetter2Valid] = useState<boolean>(false);
  const [deciderValid, setDeciderValid] = useState<boolean>(false);
  const [better1Loading, setBetter1Loading] = useState<boolean>(false);
  const [better2Loading, setBetter2Loading] = useState<boolean>(false);
  const [deciderLoading, setDeciderLoading] = useState<boolean>(false);

  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();

  useEffect(() => {
    if (account) {
      setBetter1(account.address);
    }
  }, [account]);

  useEffect(() => {
    const fetchEthToUsdRate = async () => {
      try {
        const response = await fetch("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD");
        const data = await response.json();
        setEthToUsdRate(data.USD);
      } catch (error) {
        console.error("Error fetching ETH to USD rate:", error);
      }
    };

    fetchEthToUsdRate();
  }, []);

  const resolveUserAddress = async (identifier: string, type: string): Promise<string> => {
    if (type === "wallet") {
      return await resolveAddress({ client, name: identifier });
    } else if (type === "email") {
      return await getUserWalletAddressByEmail(identifier);
    } else if (type === "phone") {
      return await getUserWalletAddressByPhone(identifier);
    } else {
      throw new Error("Invalid identifier type");
    }
  };

  const validateAddress = async (identifier: string, type: string, setValid: (isValid: boolean) => void, setLoading: (isLoading: boolean) => void) => {
    if (!identifier) {
      setValid(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const resolvedAddress = await resolveUserAddress(identifier, type);
      setValid(!!resolvedAddress);
    } catch (error) {
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      validateAddress(better1, better1Type, setBetter1Valid, setBetter1Loading);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [better1, better1Type]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      validateAddress(better2, better2Type, setBetter2Valid, setBetter2Loading);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [better2, better2Type]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      validateAddress(decider, deciderType, setDeciderValid, setDeciderLoading);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [decider, deciderType]);

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
    better1Loading,
    better2Loading,
    deciderLoading,
    canSubmit,
  };
};
