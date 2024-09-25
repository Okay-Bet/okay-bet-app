"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import { format } from "date-fns";
import { ethers } from "ethers";
import { useFetchEthToUsdRate } from "./useFetchEthToUsdRate";

const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/85117/okaybet/version/latest";

const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData {
    bets(where: { status_gt: 0 }) {
      id
      maker
      taker
      totalWager
      wagerCurrency
      createdAt
      status
    }
  }
`;

interface AnalyticsData {
  totalBets: number;
  uniqueWallets: number;
  totalVolumeUsd: number;
  timeSeriesBets: { date: string; totalBets: number }[];
  timeSeriesUniqueBettors: { date: string; uniqueBettors: number }[];
  timeSeriesWagersUsd: { date: string; totalWageredUsd: number }[];
}

interface SubgraphBet {
  id: string;
  maker: string;
  taker: string;
  totalWager: string;
  wagerCurrency: string;
  createdAt: string;
  status: string;
}

interface SubgraphResponse {
  bets: SubgraphBet[];
}

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const useAnalyticsData = (): {
  analyticsData: AnalyticsData;
  isLoading: boolean;
  isError: boolean;
} => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalBets: 0,
    uniqueWallets: 0,
    totalVolumeUsd: 0,
    timeSeriesBets: [],
    timeSeriesUniqueBettors: [],
    timeSeriesWagersUsd: [],
  });

  const ethToUsdRate = useFetchEthToUsdRate();

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

  const processAnalyticsData = useCallback(
    (bets: SubgraphBet[], usdRate: number) => {
      const uniqueWallets = new Set<string>();
      let totalVolumeUsd = 0;
      const timeSeriesMap = new Map<
        string,
        {
          totalBets: number;
          uniqueBettors: Set<string>;
          totalWageredUsd: number;
        }
      >();

      bets.forEach((bet) => {
        uniqueWallets.add(bet.maker);
        uniqueWallets.add(bet.taker);

        let wagerAmountUsd = 0;
        if (bet.wagerCurrency.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
          const wagerEth = parseFloat(ethers.utils.formatEther(bet.totalWager));
          wagerAmountUsd = wagerEth * usdRate;
        } else if (
          bet.wagerCurrency.toLowerCase() === USDC_ADDRESS.toLowerCase()
        ) {
          wagerAmountUsd = parseFloat(
            ethers.utils.formatUnits(bet.totalWager, 6)
          );
        } else {
          console.warn(`Unknown wager currency: ${bet.wagerCurrency}`);
          return; // Skip this bet if the currency is unknown
        }

        if (!isNaN(wagerAmountUsd)) {
          totalVolumeUsd += wagerAmountUsd;

          const date = format(
            new Date(parseInt(bet.createdAt) * 1000),
            "yyyy-MM-dd"
          );
          const dayData = timeSeriesMap.get(date) || {
            totalBets: 0,
            uniqueBettors: new Set<string>(),
            totalWageredUsd: 0,
          };
          dayData.totalBets += 1;
          dayData.uniqueBettors.add(bet.maker);
          dayData.uniqueBettors.add(bet.taker);
          dayData.totalWageredUsd += wagerAmountUsd;
          timeSeriesMap.set(date, dayData);
        }
      });

      let cumulativeUniqueBettors = 0;
      let cumulativeTotalWageredUsd = 0;

      const timeSeriesBets: { date: string; totalBets: number }[] = [];
      const timeSeriesUniqueBettors: { date: string; uniqueBettors: number }[] =
        [];
      const timeSeriesWagersUsd: { date: string; totalWageredUsd: number }[] =
        [];

      Array.from(timeSeriesMap.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .forEach(([date, data]) => {
          timeSeriesBets.push({ date, totalBets: data.totalBets });

          cumulativeUniqueBettors += data.uniqueBettors.size;
          timeSeriesUniqueBettors.push({
            date,
            uniqueBettors: cumulativeUniqueBettors,
          });

          cumulativeTotalWageredUsd += data.totalWageredUsd;
          timeSeriesWagersUsd.push({
            date,
            totalWageredUsd: cumulativeTotalWageredUsd,
          });
        });

      setAnalyticsData({
        totalBets: bets.length,
        uniqueWallets: uniqueWallets.size,
        totalVolumeUsd,
        timeSeriesBets,
        timeSeriesUniqueBettors,
        timeSeriesWagersUsd,
      });
    },
    []
  );

  useEffect(() => {
    if (!isLoading && !isError && subgraphData && ethToUsdRate > 0) {
      processAnalyticsData(subgraphData, ethToUsdRate);
    }
  }, [processAnalyticsData, isLoading, isError, subgraphData, ethToUsdRate]);

  return {
    analyticsData,
    isLoading: isLoading || ethToUsdRate === 0,
    isError,
  };
};
