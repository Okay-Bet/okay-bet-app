// hooks/useFetchBetDetails.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { BetDetailsType } from "@/components/types/bet";
import useWebSocket from "@/hooks/useWebSocket";
import {resolveUserAddress}  from "@/hooks/useResolveUserAddress";

export const useFetchBetDetails = (
  betAddresses: string | string[],
  isUnfundedBets: boolean = false
) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { lastEvent } = useWebSocket();

  const fetchBetDetails = useCallback(
    async (betAddress: string): Promise<BetDetailsType | null> => {
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });
        const betData = await bet({ contract: betContract });
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

          const [makerResolved, takerResolved, judgeResolved, winnerResolved] =
            await Promise.all([
              resolveUserAddress(maker),
              resolveUserAddress(taker),
              resolveUserAddress(judge),
              winner !== "0x0000000000000000000000000000000000000000"
                ? resolveUserAddress(winner)
                : { address: null, displayName: null },
            ]);

          const betDetail: BetDetailsType = {
            address: betAddress,
            maker,
            makerDisplay: makerResolved || maker,
            taker,
            takerDisplay: takerResolved || taker,
            judge,
            judgeDisplay: judgeResolved || judge,
            totalWager: totalWager.toString(),
            wagerRatio: Number(wagerRatio),
            conditions,
            status: Number(status),
            winner: winner !== "0x0000000000000000000000000000000000000000" ? winner : null,
            winnerDisplay: winnerResolved || winner,
            expirationBlock: Number(expirationBlock),
            finalized,
            wagerCurrency,
          };

          return betDetail;
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
      return null;
    },
    [isUnfundedBets]
  );

  const fetchAllBetDetails = useCallback(async () => {
    setLoading(true);
    const addresses = Array.isArray(betAddresses)
      ? betAddresses
      : [betAddresses];
    try {
      const details = await Promise.all(
        addresses.map(async (address) => {
          const detail = await fetchBetDetails(address);
          return detail;
        })
      );
      const filteredDetails = details.filter(
        (detail): detail is BetDetailsType => detail !== null
      );
      setBetDetails(filteredDetails);
    } catch (error) {
      console.error("Error fetching all bet details:", error);
      setBetDetails([]);
    } finally {
      setLoading(false);
    }
  }, [betAddresses, fetchBetDetails]);

  useEffect(() => {
    fetchAllBetDetails();
  }, [fetchAllBetDetails]);

  useEffect(() => {
    if (
      lastEvent &&
      ["BetFunded", "BetCancelled", "BetUpdated"].includes(lastEvent.type)
    ) {
      fetchAllBetDetails();
    }
  }, [lastEvent, fetchAllBetDetails]);

  return {
    betDetails,
    loading,
    fetchBetDetails: fetchAllBetDetails,
    refetchAll: fetchAllBetDetails,
  };
};