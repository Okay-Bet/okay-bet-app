// hooks/useCreateBetForm.ts
import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";
import { useValidateAddress } from "./useValidateAddress";
import { resolveUserAddress } from "./useResolveUserAddress";
import { handleFundBet } from "@/utils/handleBetActions/handleFundBet";
import { waitForBetReady } from "@/utils/waitForBetReady";
import { createBet } from "@/generated/betFactory";
import { BASE_MAINNET_RPC } from "@/constants/rpc";

// Define the type for Ethereum address
type EthereumAddress = `0x${string}`;

export const useCreateBetForm = (contract: any) => {
  const [better1, setBetter1] = useState<string>("");
  const [better2, setBetter2] = useState<string>("");
  const [decider, setDecider] = useState<string>("");
  const [better1Type, setBetter1Type] = useState<string>("wallet");
  const [better2Type, setBetter2Type] = useState<string>("wallet");
  const [deciderType, setDeciderType] = useState<string>("wallet");
  const [wagerUSD, setWagerUSD] = useState<string>("");
  const [conditions, setConditions] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const [needsFunding, setNeedsFunding] = useState<boolean>(false);
  const [newBetAddress, setNewBetAddress] = useState<string>("");
  const [resolvedBetter1, setResolvedBetter1] =
    useState<EthereumAddress | null>(null);

  const { isValid: better1Valid, isLoading: better1Loading } =
    useValidateAddress(better1, better1Type);
  const { isValid: better2Valid, isLoading: better2Loading } =
    useValidateAddress(better2, better2Type);
  const { isValid: deciderValid, isLoading: deciderLoading } =
    useValidateAddress(decider, deciderType);

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

  useEffect(() => {
    if (account) {
      setBetter1(account.address);
    }
  }, [account]);

  const convertUsdToEth = (usdAmount: string): string => {
    if (!usdAmount || !ethToUsdRate) return "0";
    const ethAmount = parseFloat(usdAmount) / ethToUsdRate;
    return ethAmount.toFixed(6);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const resolvedBetter1Address = (await resolveUserAddress(
        better1,
        better1Type
      )) as EthereumAddress;
      setResolvedBetter1(resolvedBetter1Address);
      const resolvedBetter2 = (await resolveUserAddress(
        better2,
        better2Type
      )) as EthereumAddress;
      const resolvedDecider = (await resolveUserAddress(
        decider,
        deciderType
      )) as EthereumAddress;

      const wagerInEth = (parseFloat(wagerUSD) / ethToUsdRate).toFixed(18);
      const wagerInWei = ethers.utils.parseEther(wagerInEth);

      const transaction = createBet({
        contract,
        better1: resolvedBetter1Address,
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
            const [
              betAddress,
              eventBetter1,
              eventBetter2,
              eventDecider,
              eventWager,
              eventConditions,
            ] = event.args;
            newBetAddress = betAddress;
            setMessage("Bet created successfully!");
            setIsAlertOpen(true);
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
        account.address.toLowerCase() === resolvedBetter1Address.toLowerCase()
      ) {
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
    }
  };

  const handleFundingComplete = () => {
    setNeedsFunding(false);
    setNewBetAddress("");
    setResolvedBetter1(null);
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
    needsFunding,
    newBetAddress,
    resolvedBetter1,
    handleFundingComplete,
    setNeedsFunding,
    resetForm,
  };
};
