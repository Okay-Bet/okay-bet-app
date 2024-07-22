// hooks/useBetList.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { bet } from "@/generated/bet";
import { useReadContract } from "thirdweb/react";
import eventEmitter from "@/events/eventEmitter";

interface UseBetListProps {
  contract: any;
  accountAddress: string;
}

interface BetListData {
  openBets: string[];
  unfundedBets: string[];
  betHistory: string[];
  isLoading: boolean;
}

export const useBetList = ({ contract, accountAddress }: UseBetListProps): BetListData => {
  const [openBets, setOpenBets] = useState<string[]>([]);
  const [unfundedBets, setUnfundedBets] = useState<string[]>([]);
  const [betHistory, setBetHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { data: betAddresses, isLoading: isLoadingAddresses } = useReadContract({
    contract,
    method: "function getBets() view returns (address[])",
    params: [],
  });

  const fetchBetDetails = useCallback(async () => {
    if (betAddresses && betAddresses.length > 0) {
      const open: string[] = [];
      const unfunded: string[] = [];
      const history: string[] = [];

      for (const betAddress of betAddresses) {
        try {
          const betContract = getContract({
            client,
            address: betAddress,
            chain: contract.chain,
          });

          const betData = await bet({ contract: betContract });

          if (betData) {
            const [better1, better2, decider, , , status] = betData;
            if (
              accountAddress.toLowerCase() === better1.toLowerCase() ||
              accountAddress.toLowerCase() === better2.toLowerCase() ||
              accountAddress.toLowerCase() === decider.toLowerCase()
            ) {
              if (status === 0 || status === 1 || status === 2) {
                unfunded.push(betAddress);
              } else if (status === 3) {
                open.push(betAddress);
              } else {
                history.push(betAddress);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching bet details for ${betAddress}:`, error);
        }
      }

      setOpenBets(open);
      setUnfundedBets(unfunded);
      setBetHistory(history);
      setIsLoading(false);
    }
  }, [betAddresses, accountAddress, contract.chain]);

  useEffect(() => {
    if (!isLoadingAddresses) {
      fetchBetDetails();
    }
  }, [fetchBetDetails, isLoadingAddresses]);

  useEffect(() => {
    const handleRefresh = () => {
      console.log('Refresh event received in useBetList');
      fetchBetDetails();
    };

    eventEmitter.on('refreshBetList', handleRefresh);

    return () => {
      eventEmitter.off('refreshBetList', handleRefresh);
    };
  }, [fetchBetDetails]);

  return {
    openBets,
    unfundedBets,
    betHistory,
    isLoading: isLoadingAddresses || isLoading,
  };
};