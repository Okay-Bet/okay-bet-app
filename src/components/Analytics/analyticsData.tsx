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

  if (isLoading) return <div>Loading analytics data...</div>;
  if (isError) return <div>Error fetching analytics data</div>;

  const formatUsd = (value: number) => {
    return isNaN(value) ? "N/A" : `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Funded/Resolved Bets</h3>
          <p className="text-3xl font-bold">{analyticsData.totalBets}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Unique Wallets</h3>
          <p className="text-3xl font-bold">{analyticsData.uniqueWallets}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Volume</h3>
          <p className="text-3xl font-bold">
            {formatUsd(analyticsData.totalVolumeUsd)}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            Funded/Resolved Bets Over Time
          </h3>
          <TotalBetsChart data={analyticsData.timeSeriesBets} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            Cumulative Unique Bettors
          </h3>
          <CumulativeUniqueBettorsChart
            data={analyticsData.timeSeriesUniqueBettors}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            Cumulative Volume (USD)
          </h3>
          <CumulativeWagersChart data={analyticsData.timeSeriesWagersUsd} />
        </div>
      </div>
    </div>
  );
};
