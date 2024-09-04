import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { ethers } from "ethers";
import useWebSocket from "@/hooks/useWebSocket";

export interface BetDetailsType {
  address: string;
  maker: string;
  taker: string;
  judge: string;
  totalWager: string;
  wagerRatio: number;
  conditions: string;
  status: number;
  winner: string | null;
  expirationBlock: number;
  finalized: boolean;
  wagerCurrency: string;
}

export const useFetchBetDetails = (
  betAddresses: string | string[],
  isUnfundedBets: boolean = false
) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { lastEvent } = useWebSocket();

  console.log("useFetchBetDetails called with addresses:", betAddresses);

  const fetchBetDetails = useCallback(
    async (betAddress: string): Promise<BetDetailsType | null> => {
      console.log("Fetching details for bet address:", betAddress);
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const betData = await bet({ contract: betContract });
        console.log("Raw bet data from contract:", betData);

        if (betData && Array.isArray(betData) && betData.length === 11) {
          const [
            maker,
            taker,
            judge,
            totalWager,
            wagerRatio,
            conditions,
            status,
            winner,
            expirationBlock,
            finalized,
            wagerCurrency,
          ] = betData;

          const betDetail: BetDetailsType = {
            address: betAddress,
            maker,
            taker,
            judge,
            totalWager: totalWager.toString(),
            wagerRatio: Number(wagerRatio),
            conditions,
            status: Number(status),
            winner: isUnfundedBets
              ? null
              : winner !== "0x0000000000000000000000000000000000000000"
              ? winner
              : null,
            expirationBlock: Number(expirationBlock),
            finalized,
            wagerCurrency,
          };

          console.log("Processed bet detail:", betDetail);
          return betDetail;
        } else {
          console.error("Invalid bet data structure:", betData);
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
      return null;
    },
    [isUnfundedBets]
  );

  const fetchAllBetDetails = useCallback(async () => {
    console.log("Fetching all bet details");
    setLoading(true);
    const addresses = Array.isArray(betAddresses)
      ? betAddresses
      : [betAddresses];
    console.log("Addresses to fetch:", addresses);
    try {
      const details = await Promise.all(
        addresses.map(async (address) => {
          const detail = await fetchBetDetails(address);
          console.log(`Fetched detail for ${address}:`, detail);
          return detail;
        })
      );
      console.log("All fetched details:", details);
      const filteredDetails = details.filter(
        (detail): detail is BetDetailsType => detail !== null
      );
      console.log("Filtered bet details:", filteredDetails);
      setBetDetails(filteredDetails);
    } catch (error) {
      console.error("Error fetching all bet details:", error);
      setBetDetails([]);
    } finally {
      setLoading(false);
    }
  }, [betAddresses, fetchBetDetails]);

  useEffect(() => {
    console.log("Initial fetch of bet details");
    fetchAllBetDetails();
  }, [fetchAllBetDetails]);

  useEffect(() => {
    if (
      lastEvent &&
      ["BetFunded", "BetCancelled", "BetUpdated"].includes(lastEvent.type)
    ) {
      console.log("Refetching bet details due to event:", lastEvent);
      fetchAllBetDetails();
    }
  }, [lastEvent, fetchAllBetDetails]);

  useEffect(() => {
    console.log("Current bet details state:", betDetails);
  }, [betDetails]);

  return {
    betDetails,
    loading,
    fetchBetDetails: fetchAllBetDetails,
    refetchAll: fetchAllBetDetails,
  };
};
