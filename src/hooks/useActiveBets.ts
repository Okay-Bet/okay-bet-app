// hooks/useActiveBets.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { bet } from "@/generated/bet";
import debounce from 'lodash/debounce';
import eventEmitter from "@/events/eventEmitter";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";

const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_USER_BETS = gql`
  query GetUserBets($userAddress: String!) {
    bets(
      where: {
        or: [
          {better1: $userAddress},
          {better2: $userAddress},
          {decider: $userAddress}
        ]
      }
    ) {
      id
      betAddress
      status
    }
  }
`;

interface UseActiveBetsProps {
  contract: any;
  accountAddress: string;
}

interface ActiveBetsData {
  openBets: string[];
  unfundedBets: string[];
  isLoading: boolean;
}

interface SubgraphBet {
  id: string;
  betAddress: string;
  status: number;
  better1: string;
  better2: string;
  decider: string;
  wager: string;
  conditions: string;
}

interface SubgraphResponse {
  bets: SubgraphBet[];
}

export const useActiveBets = ({
  contract,
  accountAddress,
}: UseActiveBetsProps): ActiveBetsData => {
  const [openBets, setOpenBets] = useState<string[]>([]);
  const [unfundedBets, setUnfundedBets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { data: subgraphData, isLoading: isLoadingSubgraph, refetch, isError } = useQuery({
    queryKey: ["userBets", accountAddress],
    queryFn: async () => {
      if (!accountAddress) return null;
      const response = await request<SubgraphResponse>(SUBGRAPH_URL, GET_USER_BETS, {
        userAddress: accountAddress.toLowerCase(),
      });
      return response.bets;
    },
    enabled: !!accountAddress,
  });

  const fetchBetDetails = useCallback(async (bets: SubgraphBet[]) => {
    setIsLoading(true);
    const open: string[] = [];
    const unfunded: string[] = [];

    // Filter out closed bets (status >= 4)
    const activeBets = bets.filter(bet => bet.status < 4);

    for (const subgraphBet of activeBets) {
      try {
        const betContract = getContract({
          client,
          address: subgraphBet.betAddress,
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
              unfunded.push(subgraphBet.betAddress);
            } else if (status === 3) {
              open.push(subgraphBet.betAddress);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${subgraphBet.betAddress}:`, error);
      }
    }

    setOpenBets(open);
    setUnfundedBets(unfunded);
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
        await refetch();
      },
      1000,
      { leading: true, trailing: false }
    );
    eventEmitter.on("refreshBets", handleRefresh);
    return () => {
      eventEmitter.off("refreshBets", handleRefresh);
    };
  }, [refetch]);

  return {
    openBets,
    unfundedBets,
    isLoading: isLoadingSubgraph || isLoading,
  };
};