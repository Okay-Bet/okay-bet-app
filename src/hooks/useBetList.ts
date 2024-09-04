import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import useWebSocket from "@/hooks/useWebSocket";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_USER_BETS = gql`
  query GetUserBets($userAddress: String!) {
    bets(
      where: {
        or: [
          { maker: $userAddress }
          { taker: $userAddress }
          { judge: $userAddress }
        ]
      }
    ) {
      id
      betAddress
      status
      maker
      taker
      judge
      totalWager
      wagerRatio
      conditions
      expirationBlock
      finalized
      wagerCurrency
      createdAt
      updatedAt
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
  status: string;
  maker: string;
  taker: string;
  judge: string;
  totalWager: string;
  wagerRatio: number;
  conditions: string;
  expirationBlock: string;
  finalized: boolean;
  wagerCurrency: string;
  createdAt: string;
  updatedAt: string;
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
  const { isConnected, lastEvent } = useWebSocket();

  console.log("useBetList: accountAddress", accountAddress);

  const {
    data: subgraphData,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["userBets", accountAddress],
    queryFn: async () => {
      if (!accountAddress) return null;
      console.log("Fetching bets for address:", accountAddress);
      const response = await request<SubgraphResponse>(
        SUBGRAPH_URL,
        GET_USER_BETS,
        {
          userAddress: accountAddress.toLowerCase(),
        }
      );
      console.log("Subgraph response:", response);
      return response.bets;
    },
    enabled: !!accountAddress,
  });

  const processBets = useCallback(
    (bets: SubgraphBet[]) => {
      console.log("Processing bets:", bets);
      const open: string[] = [];
      const unfunded: string[] = [];
      const history: string[] = [];

      bets.forEach((bet) => {
        console.log("Processing bet:", bet);
        if (
          accountAddress.toLowerCase() === bet.maker.toLowerCase() ||
          accountAddress.toLowerCase() === bet.taker.toLowerCase() ||
          accountAddress.toLowerCase() === bet.judge.toLowerCase()
        ) {
          const status = parseInt(bet.status);
          if (status === 0 || status === 1) {
            unfunded.push(bet.betAddress);
          } else if (status === 2) {
            open.push(bet.betAddress);
          } else if (status === 3 || status === 4 || bet.finalized) {
            history.push(bet.betAddress);
          }
        }
      });

      console.log("Processed bets - Open:", open);
      console.log("Processed bets - Unfunded:", unfunded);
      console.log("Processed bets - History:", history);

      setOpenBets(open);
      setUnfundedBets(unfunded);
      setBetHistory(history);
    },
    [accountAddress]
  );

  useEffect(() => {
    if (!isLoading && !isError && subgraphData) {
      console.log("Subgraph data received, processing bets");
      processBets(subgraphData);
    }
  }, [processBets, isLoading, isError, subgraphData]);

  useEffect(() => {
    if (isConnected && lastEvent) {
      console.log("WebSocket event received:", lastEvent);
      const { type, data } = lastEvent;

      switch (type) {
        case "BetCreated":
          console.log("BetCreated event, adding to unfundedBets:", data.betAddress);
          setUnfundedBets((prev) => [...prev, data.betAddress]);
          break;
        case "BetFunded":
          console.log("BetFunded event, moving from unfundedBets to openBets:", data.betAddress);
          setUnfundedBets((prev) =>
            prev.filter((address) => address !== data.betAddress)
          );
          setOpenBets((prev) => [...prev, data.betAddress]);
          break;
        case "BetCancelled":
        case "BetResolved":
        case "BetInvalidated":
          console.log(`${type} event, moving to betHistory:`, data.betAddress);
          setUnfundedBets((prev) =>
            prev.filter((address) => address !== data.betAddress)
          );
          setOpenBets((prev) =>
            prev.filter((address) => address !== data.betAddress)
          );
          setBetHistory((prev) => [...prev, data.betAddress]);
          break;
        default:
          console.log("Unknown event type:", type);
      }

      console.log("Refetching bets after WebSocket event");
      refetch();
    }
  }, [isConnected, lastEvent, refetch]);

  console.log("Final state - openBets:", openBets);
  console.log("Final state - unfundedBets:", unfundedBets);
  console.log("Final state - betHistory:", betHistory);

  return {
    openBets,
    unfundedBets,
    betHistory,
    isLoading,
  };
};