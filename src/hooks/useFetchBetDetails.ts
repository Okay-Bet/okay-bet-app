// hooks/useFetchBetDetails.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { ethers } from "ethers";
import eventEmitter from "@/events/eventEmitter";
import { resolveUserAddress } from "./useResolveUserAddress";

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

export const useFetchBetDetails = (betAddresses: string[]) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBetDetails = useCallback(
    async (betAddress?: string): Promise<BetDetailsType | null> => {
      if (!betAddress) {
        return fetchAllBetDetails();
      }

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

          const betDetail: BetDetailsType = {
            address: betAddress,
            better1: betData[0],
            better1Display: better1.displayName,
            better2: betData[1],
            better2Display: better2.displayName,
            decider: betData[2],
            deciderDisplay: decider.displayName,
            wagerWei: betData[3].toString(),
            wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(
              4
            ),
            conditions: betData[4],
            status: betData[5],
            winner: betData[6],
            winnerDisplay: winner.displayName,
          };

          setBetDetails((prevDetails) => {
            const updatedDetails = prevDetails.map((bet) =>
              bet.address === betAddress ? betDetail : bet
            );
            if (!updatedDetails.some((bet) => bet.address === betAddress)) {
              updatedDetails.push(betDetail);
            }
            return updatedDetails;
          });

          return betDetail;
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
      return null;
    },
    []
  );

  const fetchAllBetDetails =
    useCallback(async (): Promise<BetDetailsType | null> => {
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
      return null;
    }, [betAddresses, fetchBetDetails]);

  useEffect(() => {
    fetchAllBetDetails();
  }, [fetchAllBetDetails]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchAllBetDetails();
    };
    eventEmitter.on("refreshOpenBets", handleRefresh);
    return () => {
      eventEmitter.off("refreshOpenBets", handleRefresh);
    };
  }, [fetchAllBetDetails]);

  return { betDetails, fetchBetDetails, loading };
};
