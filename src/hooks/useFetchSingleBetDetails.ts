// hooks/useFetchSingleBetDetails.ts
import { useState, useEffect } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { ethers } from "ethers";
import { resolveUserAddress } from "./useResolveUserAddress"; // Import the new function

export interface BetDetailsType {
  address: string;
  better1: string;
  better1Display: string;
  better2: string;
  better2Display: string;
  decider: string;
  deciderDisplay: string;
  wagerWei: string;
  wagerEth: string;
  conditions: string;
  status: number;
  winner: string | null;
  winnerDisplay: string | null;
}

export const useFetchSingleBetDetails = (betAddress: string | null) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetDetails = async (betAddress: string): Promise<BetDetailsType | null> => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });
      const betData = await bet({ contract: betContract });
      if (betData) {
        const [better1, better2, decider, winner] = await Promise.all([
          resolveUserAddress(betData[0]),
          resolveUserAddress(betData[1]),
          resolveUserAddress(betData[2]),
          betData[6] !== "0x0000000000000000000000000000000000000000"
            ? resolveUserAddress(betData[6])
            : { address: null, displayName: "Not resolved yet" },
        ]);

        const details: BetDetailsType = {
          address: betAddress,
          better1: betData[0],
          better1Display: better1.displayName,
          better2: betData[1],
          better2Display: better2.displayName,
          decider: betData[2],
          deciderDisplay: decider.displayName,
          wagerWei: betData[3].toString(),
          wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(4),
          conditions: betData[4],
          status: betData[5],
          winner: betData[6],
          winnerDisplay: winner.displayName,
        };
        return details;
      }
    } catch (error) {
      console.error(`Error fetching bet details for ${betAddress}:`, error);
    }
    return null;
  };

  const fetchSingleBetDetails = async () => {
    if (betAddress) {
      setLoading(true);
      const details = await fetchBetDetails(betAddress);
      setBetDetails(details);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSingleBetDetails();
  }, [betAddress]);

  return { betDetails, fetchBetDetails, loading };
};