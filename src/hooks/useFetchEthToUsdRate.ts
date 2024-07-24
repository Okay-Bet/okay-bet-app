// hooks/useFetchEthToUsdRate.ts
import { useState, useEffect } from "react";

export const useFetchEthToUsdRate = () => {
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);

  useEffect(() => {
    const fetchEthToUsdRate = async () => {
      try {
        const response = await fetch(
          "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
        );
        const data = await response.json();
        setEthToUsdRate(data.USD);
      } catch (error) {
        console.error("Error fetching ETH to USD rate:", error);
      }
    };

    fetchEthToUsdRate();
  }, []);

  return ethToUsdRate;
};
