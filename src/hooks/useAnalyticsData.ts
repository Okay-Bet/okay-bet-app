import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData {
    bets {
      id
      maker
      taker
      totalWager
    }
  }
`;

interface AnalyticsData {
  totalBets: number;
  uniqueWallets: number;
  totalVolume: string;
}

interface SubgraphBet {
  id: string;
  maker: string;
  taker: string;
  totalWager: string;
}

interface SubgraphResponse {
  bets: SubgraphBet[];
}

export const useAnalyticsData = (): {
  analyticsData: AnalyticsData;
  isLoading: boolean;
  isError: boolean;
} => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalBets: 0,
    uniqueWallets: 0,
    totalVolume: "0",
  });

  const {
    data: subgraphData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["analyticsData"],
    queryFn: async () => {
      const response = await request<SubgraphResponse>(
        SUBGRAPH_URL,
        GET_ANALYTICS_DATA
      );
      return response.bets;
    },
  });

  const processAnalyticsData = useCallback((bets: SubgraphBet[]) => {
    const uniqueWallets = new Set<string>();
    let totalVolume = BigInt(0);

    bets.forEach((bet) => {
      uniqueWallets.add(bet.maker);
      uniqueWallets.add(bet.taker);
      totalVolume += BigInt(bet.totalWager);
    });

    setAnalyticsData({
      totalBets: bets.length,
      uniqueWallets: uniqueWallets.size,
      totalVolume: totalVolume.toString(),
    });
  }, []);

  useEffect(() => {
    if (!isLoading && !isError && subgraphData) {
      processAnalyticsData(subgraphData);
    }
  }, [processAnalyticsData, isLoading, isError, subgraphData]);

  return {
    analyticsData,
    isLoading,
    isError,
  };
};