"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import { format } from "date-fns";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData {
    bets(orderBy: createdAt, orderDirection: asc) {
      id
      maker
      taker
      totalWager
      wagerCurrency
      createdAt
    }
  }
`;

interface AnalyticsData {
  totalBets: number;
  uniqueWallets: number;
  totalVolume: string;
  timeSeriesBets: { date: string; totalBets: number }[];
  timeSeriesUniqueBettors: { date: string; uniqueBettors: number }[];
  timeSeriesWagers: { date: string; totalWagered: string }[];
}

interface SubgraphBet {
  id: string;
  maker: string;
  taker: string;
  totalWager: string;
  wagerCurrency: string;
  createdAt: string;
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
    timeSeriesBets: [],
    timeSeriesUniqueBettors: [],
    timeSeriesWagers: [],
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
    const timeSeriesMap = new Map<
      string,
      { totalBets: number; uniqueBettors: Set<string>; totalWagered: bigint }
    >();

    bets.forEach((bet) => {
      uniqueWallets.add(bet.maker);
      uniqueWallets.add(bet.taker);
      totalVolume += BigInt(bet.totalWager);

      const date = format(
        new Date(parseInt(bet.createdAt) * 1000),
        "yyyy-MM-dd"
      );
      const dayData = timeSeriesMap.get(date) || {
        totalBets: 0,
        uniqueBettors: new Set<string>(),
        totalWagered: BigInt(0),
      };
      dayData.totalBets += 1;
      dayData.uniqueBettors.add(bet.maker);
      dayData.uniqueBettors.add(bet.taker);
      dayData.totalWagered += BigInt(bet.totalWager);
      timeSeriesMap.set(date, dayData);
    });

    let cumulativeUniqueBettors = 0;
    let cumulativeTotalWagered = BigInt(0);

    const timeSeriesBets: { date: string; totalBets: number }[] = [];
    const timeSeriesUniqueBettors: { date: string; uniqueBettors: number }[] =
      [];
    const timeSeriesWagers: { date: string; totalWagered: string }[] = [];

    Array.from(timeSeriesMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .forEach(([date, data]) => {
        timeSeriesBets.push({ date, totalBets: data.totalBets });

        cumulativeUniqueBettors += data.uniqueBettors.size;
        timeSeriesUniqueBettors.push({
          date,
          uniqueBettors: cumulativeUniqueBettors,
        });

        cumulativeTotalWagered += data.totalWagered;
        timeSeriesWagers.push({
          date,
          totalWagered: cumulativeTotalWagered.toString(),
        });
      });

    setAnalyticsData({
      totalBets: bets.length,
      uniqueWallets: uniqueWallets.size,
      totalVolume: totalVolume.toString(),
      timeSeriesBets,
      timeSeriesUniqueBettors,
      timeSeriesWagers,
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
