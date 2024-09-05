import { useState, useEffect, useCallback, FormEvent } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { ethers, BigNumber } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";
import { resolveUserAddress } from "./useResolveUserAddress";
import { useFundBet } from "@/hooks/useFundBet";
import { waitForBetReady } from "@/utils/waitForBetReady";
import { createBet } from "@/generated/betFactory";
import { BASE_MAINNET_RPC } from "@/constants/rpc";
import debounce from "lodash/debounce";
import useWebSocket from "@/hooks/useWebSocket";

type EthereumAddress = `0x${string}`;

export const useCreateBetForm = (contract: any) => {
  const [maker, setMaker] = useState<string>("");
  const [taker, setTaker] = useState<string>("");
  const [judge, setJudge] = useState<string>("");
  const [wagerUSD, setWagerUSD] = useState<string>("");
  const [wagerRatio, setWagerRatio] = useState<number>(50);
  const [conditions, setConditions] = useState<string>("");
  const [expirationBlocks, setExpirationBlocks] = useState<number>(302400); // Default to 1 week
  const [wagerCurrency, setWagerCurrency] = useState<string>(
    ethers.constants.AddressZero
  ); // Default to ETH
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const [makerValid, setMakerValid] = useState<boolean>(false);
  const [takerValid, setTakerValid] = useState<boolean>(false);
  const [judgeValid, setJudgeValid] = useState<boolean>(false);
  const [makerLoading, setMakerLoading] = useState<boolean>(false);
  const [takerLoading, setTakerLoading] = useState<boolean>(false);
  const [judgeLoading, setJudgeLoading] = useState<boolean>(false);

  const [resolvedMaker, setResolvedMaker] = useState<EthereumAddress | null>(
    null
  );
  const [resolvedTaker, setResolvedTaker] = useState<EthereumAddress | null>(
    null
  );
  const [resolvedJudge, setResolvedJudge] = useState<EthereumAddress | null>(
    null
  );

  const [makerDisplayName, setMakerDisplayName] = useState<string>("");
  const [takerDisplayName, setTakerDisplayName] = useState<string>("");
  const [judgeDisplayName, setJudgeDisplayName] = useState<string>("");

  const [makerAddress, setMakerAddress] = useState<string | null>(null);
  const [takerAddress, setTakerAddress] = useState<string | null>(null);
  const [judgeAddress, setJudgeAddress] = useState<string | null>(null);

  const ethToUsdRate = useFetchEthToUsdRate();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();
  const handleFundBet = useFundBet();
  const { emitEvent } = useWebSocket();

  const resetForm = () => {
    setMaker(account?.address || "");
    setTaker("");
    setJudge("");
    setWagerUSD("");
    setWagerRatio(50);
    setConditions("");
    setExpirationBlocks(302400);
    setWagerCurrency(ethers.constants.AddressZero);
    setIsFormVisible(false);
  };

  const validateAndResolveAddress = useCallback(
    async (
      value: string,
      setValid: (valid: boolean) => void,
      setLoading: (loading: boolean) => void,
      setResolvedAddress: (address: EthereumAddress | null) => void,
      setDisplayName: (name: string) => void,
      setWalletAddress: (address: string | null) => void
    ) => {
      setLoading(true);
      try {
        const { address, displayName } = await resolveUserAddress(value);
        setValid(!!address);
        setResolvedAddress(address as EthereumAddress | null);
        setDisplayName(displayName);
        setWalletAddress(address);
      } catch (error) {
        console.error("Error resolving address:", error);
        setValid(false);
        setResolvedAddress(null);
        setDisplayName(value);
        setWalletAddress(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedValidateAndResolveAddress = useCallback(
    debounce(validateAndResolveAddress, 500),
    [validateAndResolveAddress]
  );

  useEffect(() => {
    const initializeMaker = async () => {
      if (account) {
        setMakerLoading(true);
        try {
          const { address, displayName } = await resolveUserAddress(
            account.address
          );
          setMaker(displayName);
          setMakerDisplayName(displayName);
          setResolvedMaker(address as EthereumAddress);
          setMakerValid(true);
          setMakerAddress(address);
        } catch (error) {
          console.error("Error initializing maker:", error);
          setMaker(account.address);
          setMakerDisplayName(account.address);
          setResolvedMaker(account.address as EthereumAddress);
          setMakerValid(true);
          setMakerAddress(account.address);
        } finally {
          setMakerLoading(false);
        }
      }
    };

    initializeMaker();
  }, [account]);

  useEffect(() => {
    if (maker !== makerDisplayName) {
      debouncedValidateAndResolveAddress(
        maker,
        setMakerValid,
        setMakerLoading,
        setResolvedMaker,
        setMakerDisplayName,
        setMakerAddress
      );
    }
  }, [maker, makerDisplayName, debouncedValidateAndResolveAddress]);

  useEffect(() => {
    debouncedValidateAndResolveAddress(
      taker,
      setTakerValid,
      setTakerLoading,
      setResolvedTaker,
      setTakerDisplayName,
      setTakerAddress
    );
  }, [taker, debouncedValidateAndResolveAddress]);

  useEffect(() => {
    debouncedValidateAndResolveAddress(
      judge,
      setJudgeValid,
      setJudgeLoading,
      setResolvedJudge,
      setJudgeDisplayName,
      setJudgeAddress
    );
  }, [judge, debouncedValidateAndResolveAddress]);

  const convertUsdToEth = (usdAmount: string): string => {
    if (!usdAmount || !ethToUsdRate) return "0";
    const ethAmount = parseFloat(usdAmount) / ethToUsdRate;
    return ethAmount.toFixed(6);
  };

  const calculateWagerWei = (
    totalWager: string,
    wagerRatio: number,
    isMaker: boolean
  ): string => {
    const totalWagerBN = BigNumber.from(totalWager);
    const wagerWeiBN = isMaker
      ? totalWagerBN.mul(wagerRatio).div(100)
      : totalWagerBN.mul(100 - wagerRatio).div(100);
    return wagerWeiBN.toString();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsAlertOpen(false);

    try {
      if (!resolvedMaker || !resolvedTaker || !resolvedJudge) {
        throw new Error("Failed to resolve one or more addresses");
      }

      const wagerInEth = (parseFloat(wagerUSD) / ethToUsdRate).toFixed(18);
      const wagerInWei = ethers.utils.parseEther(wagerInEth);

      const transaction = createBet({
        contract,
        maker: resolvedMaker,
        taker: resolvedTaker,
        judge: resolvedJudge,
        totalWager: BigInt(wagerInWei.toString()),
        wagerRatio: wagerRatio,
        conditions,
        wagerCurrency,
        expirationBlocks,
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
            "event BetCreated(address indexed betAddress, address indexed maker, address indexed taker, address judge, uint256 totalWager, uint8 wagerRatio, string conditions, uint256 expirationBlock, address wagerCurrency)",
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
        account.address.toLowerCase() === resolvedMaker.toLowerCase()
      ) {
        setIsFunding(true);
        const isBetReady = await waitForBetReady(newBetAddress);
        if (isBetReady) {
          const wagerWei = calculateWagerWei(
            wagerInWei.toString(),
            wagerRatio,
            true
          );
          await handleFundBet(
            newBetAddress,
            wagerWei,
            wagerCurrency,
            async (betAddress: string) => {
              // Implement fetchBetDetails here if needed
              console.log("Fetching bet details for:", betAddress);
              return null;
            },
            setMessage,
            setIsAlertOpen,
            setIsLoading
          );
          setMessage("Bet created and funded successfully!");
          emitEvent("betFunded", {
            betAddress: newBetAddress,
            amount: wagerWei,
          });
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

  const canSubmit =
    makerValid && takerValid && judgeValid && wagerUSD && conditions;

  return {
    maker,
    setMaker,
    taker,
    setTaker,
    judge,
    setJudge,
    wagerUSD,
    setWagerUSD,
    wagerRatio,
    setWagerRatio,
    conditions,
    setConditions,
    expirationBlocks,
    setExpirationBlocks,
    wagerCurrency,
    setWagerCurrency,
    message,
    isLoading,
    isFunding,
    isFormVisible,
    setIsFormVisible,
    isAlertOpen,
    setIsAlertOpen,
    handleSubmit,
    makerValid,
    takerValid,
    judgeValid,
    ethToUsdRate,
    convertUsdToEth,
    makerLoading,
    takerLoading,
    judgeLoading,
    canSubmit,
    resetForm,
    makerDisplayName,
    takerDisplayName,
    judgeDisplayName,
    makerAddress,
    takerAddress,
    judgeAddress,
  };
};
