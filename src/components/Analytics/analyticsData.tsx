"use client";

import React from "react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  TotalBetsChart,
  CumulativeUniqueBettorsChart,
  CumulativeWagersChart,
} from "./timeSeriesChart";

export const AnalyticsDashboard: React.FC = () => {
  const { analyticsData, isLoading, isError } = useAnalyticsData();

  if (isLoading)
    return (
      <div className="text-white text-center py-20">
        Loading analytics data...
      </div>
    );
  if (isError)
    return (
      <div className="text-red-500 text-center py-20">
        Error fetching analytics data
      </div>
    );

  const formatUsd = (value: number) => {
    return isNaN(value) ? "N/A" : `$${value.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-10 text-center text-red-600">
        Okay Bet Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <StatCard title="Total Bets" value={analyticsData.totalBets} />
        <StatCard title="Unique Wallets" value={analyticsData.uniqueWallets} />
        <StatCard
          title="Total Volume"
          value={formatUsd(analyticsData.totalVolumeUsd)}
        />
      </div>
      <div className="space-y-12">
        <ChartCard
          title="Total Bets"
          chart={<TotalBetsChart data={analyticsData.timeSeriesBets} />}
        />
        <ChartCard
          title="Unique Bettors"
          chart={
            <CumulativeUniqueBettorsChart
              data={analyticsData.timeSeriesUniqueBettors}
            />
          }
        />
        <ChartCard
          title="Cumulative Volume (USD)"
          chart={
            <CumulativeWagersChart data={analyticsData.timeSeriesWagersUsd} />
          }
        />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number }> = ({
  title,
  value,
}) => (
  <div className="bg-gray-800 rounded-lg p-6 shadow-lg transform hover:scale-105 transition-transform duration-300">
    <h3 className="text-lg font-semibold mb-2 text-red-300">{title}</h3>
    <p className="text-3xl font-bold text-orange-500">{value}</p>
  </div>
);

const ChartCard: React.FC<{ title: string; chart: React.ReactNode }> = ({
  title,
  chart,
}) => (
  <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
    <h3 className="text-xl font-semibold mb-4 text-red-300">{title}</h3>
    {chart}
  </div>
);
