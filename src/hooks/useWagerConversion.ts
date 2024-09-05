// hooks/useWagerConversion.ts
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";

export const useWagerConversion = (totalWager: string, wagerRatio: number) => {
  const [makerWagerEth, setMakerWagerEth] = useState<string>("");
  const [takerWagerEth, setTakerWagerEth] = useState<string>("");
  const [makerWagerUsd, setMakerWagerUsd] = useState<string>("");
  const [takerWagerUsd, setTakerWagerUsd] = useState<string>("");
  const ethToUsdRate = useFetchEthToUsdRate();

  useEffect(() => {
    if (totalWager && wagerRatio) {
      const totalWagerEth = ethers.utils.formatEther(totalWager);
      const makerWager =
        parseFloat(totalWagerEth) * (wagerRatio / (wagerRatio + 1));
      const takerWager = parseFloat(totalWagerEth) - makerWager;

      setMakerWagerEth(makerWager.toFixed(6));
      setTakerWagerEth(takerWager.toFixed(6));

      if (ethToUsdRate) {
        setMakerWagerUsd((makerWager * ethToUsdRate).toFixed(2));
        setTakerWagerUsd((takerWager * ethToUsdRate).toFixed(2));
      }
    }
  }, [totalWager, wagerRatio, ethToUsdRate]);

  return { makerWagerEth, takerWagerEth, makerWagerUsd, takerWagerUsd };
};
