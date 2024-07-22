// hooks/useFetchBetDetails.ts
import { useState, useEffect } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { ethers } from "ethers";

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

export const useFetchBetDetails = (
  betAddresses: string[]
): {
  betDetails: BetDetailsType[];
  fetchBetDetails: (betAddress: string) => Promise<BetDetailsType | null>;
  loading: boolean;
} => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetDetails = async (
    betAddress: string
  ): Promise<BetDetailsType | null> => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const betData = await bet({ contract: betContract });

      if (betData) {
        const [better1, better2, decider, winner] = await Promise.all([
          resolveName({ client, address: betData[0] }).catch(() => null),
          resolveName({ client, address: betData[1] }).catch(() => null),
          resolveName({ client, address: betData[2] }).catch(() => null),
          betData[6] !== "0x0000000000000000000000000000000000000000"
            ? resolveName({ client, address: betData[6] }).catch(
                () => betData[6]
              )
            : "Not resolved yet",
        ]);

        const details = {
          address: betAddress,
          better1: betData[0],
          better1Display: better1 || betData[0],
          better2: betData[1],
          better2Display: better2 || betData[1],
          decider: betData[2],
          deciderDisplay: decider || betData[2],
          wagerWei: betData[3].toString(),
          wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(4),
          conditions: betData[4],
          status: betData[5],
          winner: betData[6],
          winnerDisplay: winner || betData[6],
        };

        return details;
      }
    } catch (error) {
      console.error(`Error fetching bet details for ${betAddress}:`, error);
    }

    return null;
  };

  const fetchAllBetDetails = async () => {
    setLoading(true);
    const details: BetDetailsType[] = [];

    for (const betAddress of betAddresses) {
      const betDetail = await fetchBetDetails(betAddress);
      if (betDetail) {
        details.push(betDetail);
      }
    }

    setBetDetails(details);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllBetDetails();
  }, [betAddresses]);

  return { betDetails, fetchBetDetails, loading };
};
