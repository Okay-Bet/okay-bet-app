import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { resolveAddress } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import { client } from "@/app/client";
import { createBet } from "../generated/betFactory";

export const useCreateBetForm = (contract: any) => {
  const [better1, setBetter1] = useState<string>("");
  const [better2, setBetter2] = useState<string>("");
  const [decider, setDecider] = useState<string>("");
  const [wagerUSD, setWagerUSD] = useState<string>("");
  const [conditions, setConditions] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const resolvedBetter1 = await resolveAddress({ client, name: better1 });
      const resolvedBetter2 = await resolveAddress({ client, name: better2 });
      const resolvedDecider = await resolveAddress({ client, name: decider });
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

  return {
    better1,
    setBetter1,
    better2,
    setBetter2,
    decider,
    setDecider,
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
    handleSubmit
  };
};
