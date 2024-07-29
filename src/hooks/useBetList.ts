// hooks/useBetList.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { bet } from "@/generated/bet";
import { useReadContract } from "thirdweb/react";
import debounce from 'lodash/debounce';
import eventEmitter from "@/events/eventEmitter";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";

const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_USER_BETS = gql`
  query GetUserBets($userAddress: String!) {
    betCreateds(
      where: {
        or: [
          { better1: $userAddress }
          { better2: $userAddress }
          { decider: $userAddress }
        ]
      }
    ) {
      betAddress
    }
  }
`;

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

interface SubgraphResponse {
  betCreateds: { betAddress: string }[];
}

export const useBetList = ({
  contract,
  accountAddress,
}: UseBetListProps): BetListData => {
  const [openBets, setOpenBets] = useState<string[]>([]);
  const [unfundedBets, setUnfundedBets] = useState<string[]>([]);
  const [betHistory, setBetHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { data: subgraphData, isLoading: isLoadingSubgraph, refetch, isError } = useQuery({
    queryKey: ["userBets", accountAddress],
    queryFn: async () => {
      if (!accountAddress) return null;
      const response = await request<SubgraphResponse>(SUBGRAPH_URL, GET_USER_BETS, {
        userAddress: accountAddress.toLowerCase(),
      });
      return response.betCreateds.map((bet) => bet.betAddress);
    },
    enabled: !!accountAddress,
  });

  const fetchBetDetails = useCallback(async (betAddresses: string[]) => {
    setIsLoading(true);
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
  }, [accountAddress, contract.chain]);

  useEffect(() => {
    if (!isLoadingSubgraph && !isError && subgraphData) {
      fetchBetDetails(subgraphData);
    }
  }, [fetchBetDetails, isLoadingSubgraph, isError, subgraphData]);

  useEffect(() => {
    const handleRefresh = debounce(
      async () => {
        // Refetch subgraph data
        await refetch();
        // Then fetch updated bet details
        if (subgraphData) {
          fetchBetDetails(subgraphData);
        }
      },
      1000,
      { leading: true, trailing: false }
    );
    eventEmitter.on("refreshBets", handleRefresh);
    return () => {
      eventEmitter.off("refreshBets", handleRefresh);
    };
  }, [refetch, fetchBetDetails, subgraphData]);

  return {
    openBets,
    unfundedBets,
    betHistory,
    isLoading: isLoadingSubgraph || isLoading,
  };
};