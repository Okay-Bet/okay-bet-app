// src/hooks/useFetchUnfundedBetDetails.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import eventEmitter from "@/events/eventEmitter";

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

export const useFetchUnfundedBetDetails = (betAddresses: string[]) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetDetails = useCallback(async (betAddress: string): Promise<BetDetailsType | null> => {
    console.log(`Fetching details for bet ${betAddress}`);
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
            ? resolveName({ client, address: betData[6] }).catch(() => betData[6])
            : "Not resolved yet",
        ]);

        const betDetail: BetDetailsType = {
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

        console.log('Fetched bet details:', betDetail);

        setBetDetails(prevDetails => {
          const updatedDetails = prevDetails.map(bet => 
            bet.address === betAddress ? betDetail : bet
          );
          if (!updatedDetails.some(bet => bet.address === betAddress)) {
            updatedDetails.push(betDetail);
          }
          console.log('Updated bet details state:', updatedDetails);
          return updatedDetails;
        });

        return betDetail;
      }
    } catch (error) {
      console.error(`Error fetching bet details for ${betAddress}:`, error);
    }
    return null;
  }, []);

  const fetchAllBetDetails = useCallback(async () => {
    console.log('Fetching all bet details');
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
  }, [betAddresses, fetchBetDetails]);

  useEffect(() => {
    fetchAllBetDetails();
  }, [fetchAllBetDetails]);

  useEffect(() => {
    const handleRefresh = () => {
      console.log('Refresh event received in useFetchUnfundedBetDetails');
      fetchAllBetDetails();
    };

    eventEmitter.on('refreshUnfundedBets', handleRefresh);

    return () => {
      eventEmitter.off('refreshUnfundedBets', handleRefresh);
    };
  }, [fetchAllBetDetails]);

  return { betDetails, fetchBetDetails, loading };
};