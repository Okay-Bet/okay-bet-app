// src/hooks/useFetchUnfundedBetDetails.ts
import { useState, useEffect } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import { BetDetailsType } from "@/components/types/bet";

export const useFetchUnfundedBetDetails = (betAddresses: string[]): { betDetails: BetDetailsType[], fetchBetDetails: () => void, loading: boolean } => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetDetails = async () => {
    const details: BetDetailsType[] = [];

    for (const betAddress of betAddresses) {
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const betData = await bet({ contract: betContract });

        if (betData && (betData[5] === 0 || betData[5] === 1 || betData[5] === 2)) {
          const [better1, better2, decider, winner] = await Promise.all([
            resolveName({ client, address: betData[0] }).catch(() => null),
            resolveName({ client, address: betData[1] }).catch(() => null),
            resolveName({ client, address: betData[2] }).catch(() => null),
            betData[6] !== "0x0000000000000000000000000000000000000000"
              ? resolveName({ client, address: betData[6] }).catch(() => betData[6])
              : null,
          ]);

          details.push({
            address: betAddress,
            better1: betData[0],
            better1Display: better1 || betData[0],
            better2: betData[1],
            better2Display: better2 || betData[1],
            decider: betData[2],
            deciderDisplay: decider || betData[2],
            wagerWei: betData[3].toString(),
            wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(4), // Rounded to 4 decimals
            conditions: betData[4],
            status: betData[5],
            winner: betData[6],
            winnerDisplay: winner || betData[6],
          });
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
    }

    setBetDetails(details);
    setLoading(false);
  };

  useEffect(() => {
    fetchBetDetails();
  }, [betAddresses]);

  return { betDetails, fetchBetDetails, loading };
};
