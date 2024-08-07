// hooks/useBetList.ts
import { useState, useEffect, useCallback } from "react";
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
      better1
      better2
      decider
    }
  }
`;

interface UseBetListProps {
  accountAddress: string;
}

interface BetListData {
  openBets: string[];
  unfundedBets: string[];
  betHistory: string[];
  isLoading: boolean;
}

interface SubgraphBet {
  id: string;
  betAddress: string;
  status: number;
  better1: string;
  better2: string;
  decider: string;
}

interface SubgraphResponse {
  bets: SubgraphBet[];
}

export const useBetList = ({
  accountAddress,
}: UseBetListProps): BetListData => {
  const [openBets, setOpenBets] = useState<string[]>([]);
  const [unfundedBets, setUnfundedBets] = useState<string[]>([]);
  const [betHistory, setBetHistory] = useState<string[]>([]);

  const { data: subgraphData, isLoading, refetch, isError } = useQuery({
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

  const processBets = useCallback((bets: SubgraphBet[]) => {
    const open: string[] = [];
    const unfunded: string[] = [];
    const history: string[] = [];

    bets.forEach(bet => {
      if (
        accountAddress.toLowerCase() === bet.better1.toLowerCase() ||
        accountAddress.toLowerCase() === bet.better2.toLowerCase() ||
        accountAddress.toLowerCase() === bet.decider.toLowerCase()
      ) {
        if (bet.status === 0 || bet.status === 1 || bet.status === 2) {
          unfunded.push(bet.betAddress);
        } else if (bet.status === 3) {
          open.push(bet.betAddress);
        } else if (bet.status === 4 || bet.status === 5) {
          history.push(bet.betAddress);
        }
      }
    });

    setOpenBets(open);
    setUnfundedBets(unfunded);
    setBetHistory(history);
  }, [accountAddress]);

  useEffect(() => {
    if (!isLoading && !isError && subgraphData) {
      processBets(subgraphData);
    }
  }, [processBets, isLoading, isError, subgraphData]);

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
    betHistory,
    isLoading,
  };
};