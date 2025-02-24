import { useBalance } from "@starknet-react/core";
import { useState } from "react";
import { useAccount, useContract } from "@starknet-react/core";

const USDC_CONTRACT =
  "0x042838ee5b65fe9c5b24afd1f650f7e40564cc2d586a1d9ca8c4120456707d91";

export const useInvestment = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { address } = useAccount();

  const {
    data: usdcBalance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
    token: USDC_CONTRACT,
    watch: true,
  });

  return {
    address,
    isExpanded,
    setIsExpanded,
    usdcBalance,
    balanceError,
    balanceLoading,
  };
};
