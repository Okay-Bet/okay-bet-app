// hooks/useCreateBetForm.ts
import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";
import { resolveUserAddress } from "./useResolveUserAddress";
import { handleFundBet } from "@/utils/handleBetActions/handleFundBet";
import { waitForBetReady } from "@/utils/waitForBetReady";
import { createBet } from "@/generated/betFactory";
import { BASE_MAINNET_RPC } from "@/constants/rpc";

type EthereumAddress = `0x${string}`;

export const useCreateBetForm = (contract: any) => {
  const [better1, setBetter1] = useState<string>("");
  const [better2, setBetter2] = useState<string>("");
  const [decider, setDecider] = useState<string>("");
  const [wagerUSD, setWagerUSD] = useState<string>("");
  const [conditions, setConditions] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const [better1Valid, setBetter1Valid] = useState<boolean>(false);
  const [better2Valid, setBetter2Valid] = useState<boolean>(false);
  const [deciderValid, setDeciderValid] = useState<boolean>(false);
  const [better1Loading, setBetter1Loading] = useState<boolean>(false);
  const [better2Loading, setBetter2Loading] = useState<boolean>(false);
  const [deciderLoading, setDeciderLoading] = useState<boolean>(false);

  const [needsFunding, setNeedsFunding] = useState<boolean>(false);
  const [newBetAddress, setNewBetAddress] = useState<string>("");
  const [resolvedBetter1, setResolvedBetter1] = useState<EthereumAddress | null>(null);
  const [resolvedBetter2, setResolvedBetter2] = useState<EthereumAddress | null>(null);
  const [resolvedDecider, setResolvedDecider] = useState<EthereumAddress | null>(null);

  const ethToUsdRate = useFetchEthToUsdRate();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();

  const resetForm = () => {
    setBetter1(account?.address || "");
    setBetter2("");
    setDecider("");
    setWagerUSD("");
    setConditions("");
    setIsFormVisible(false);
  };

  const validateAndResolveAddress = async (
    value: string,
    setValid: (valid: boolean) => void,
    setLoading: (loading: boolean) => void,
    setResolvedAddress: (address: EthereumAddress | null) => void
  ) => {
    setLoading(true);
    try {
      const resolvedAddress = await resolveUserAddress(value);
      setValid(!!resolvedAddress);
      setResolvedAddress(resolvedAddress as EthereumAddress | null);
    } catch (error) {
      console.error("Error resolving address:", error);
      setValid(false);
      setResolvedAddress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      setBetter1(account.address);
    }
  }, [account]);

  useEffect(() => {
    validateAndResolveAddress(better1, setBetter1Valid, setBetter1Loading, setResolvedBetter1);
  }, [better1]);

  useEffect(() => {
    validateAndResolveAddress(better2, setBetter2Valid, setBetter2Loading, setResolvedBetter2);
  }, [better2]);

  useEffect(() => {
    validateAndResolveAddress(decider, setDeciderValid, setDeciderLoading, setResolvedDecider);
  }, [decider]);

  const convertUsdToEth = (usdAmount: string): string => {
    if (!usdAmount || !ethToUsdRate) return "0";
    const ethAmount = parseFloat(usdAmount) / ethToUsdRate;
    return ethAmount.toFixed(6);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsAlertOpen(false);

    try {
      if (!resolvedBetter1 || !resolvedBetter2 || !resolvedDecider) {
        throw new Error("Failed to resolve one or more addresses");
      }

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

      const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);
      const startBlock = await provider.getBlockNumber();

      await sendTransaction(transaction);

      let newBetAddress = "";
      const checkForEvent = async () => {
        const currentBlock = await provider.getBlockNumber();
        const factoryContract = new ethers.Contract(
          contract.address,
          [
            "event BetCreated(address betAddress, address better1, address better2, address decider, uint256 wager, string conditions)",
          ],
          provider
        );

        const events = await factoryContract.queryFilter(
          factoryContract.filters.BetCreated(),
          startBlock,
          currentBlock
        );

        if (events.length > 0) {
          const event = events[0];
          if (event.args) {
            const [betAddress] = event.args;
            newBetAddress = betAddress;
            return true;
          }
        }
        return false;
      };

      // Wait for the bet creation event
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (await checkForEvent()) {
          break;
        }
      }

      console.log("New bet address:", newBetAddress);

      if (
        newBetAddress &&
        account &&
        account.address.toLowerCase() === resolvedBetter1.toLowerCase()
      ) {
        setIsFunding(true);
        const isBetReady = await waitForBetReady(newBetAddress);
        if (isBetReady) {
          await handleFundBet(
            newBetAddress,
            wagerInWei.toString(),
            sendTransaction,
            async () => {}, // We don't need to fetch bet details here
            setMessage,
            setIsAlertOpen,
            setIsLoading
          );
          setMessage("Bet created and funded successfully!");
        } else {
          setMessage(
            "Bet created, but not ready for funding. Please try funding manually."
          );
        }
      } else {
        setMessage("Bet created successfully!");
      }

      setIsAlertOpen(true);
      resetForm();
    } catch (error: any) {
      console.error("Error creating or funding bet:", error);
      setMessage(`Error: ${error.message}`);
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
      setIsFunding(false);
    }
  };

  const handleFundingComplete = () => {
    setNeedsFunding(false);
    setNewBetAddress("");
    setResolvedBetter1(null);
  };

  const canSubmit = better1Valid && better2Valid && deciderValid && wagerUSD && conditions;

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
    isFunding,
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
    needsFunding,
    newBetAddress,
    resolvedBetter1,
    handleFundingComplete,
    setNeedsFunding,
    resetForm,
  };
};