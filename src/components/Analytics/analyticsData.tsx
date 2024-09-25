"use client";

import React from 'react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useFetchEthToUsdRate } from '@/hooks/useFetchEthToUsdRate';
import { ethers } from 'ethers';
import { TotalBetsChart, CumulativeUniqueBettorsChart, CumulativeWagersChart } from './timeSeriesChart';

export const AnalyticsDashboard: React.FC = () => {
  const { analyticsData, isLoading, isError } = useAnalyticsData();
  const ethToUsdRate = useFetchEthToUsdRate();

  if (isLoading) return <div>Loading analytics data...</div>;
  if (isError) return <div>Error fetching analytics data</div>;

  // Convert Wei to ETH
  const totalVolumeEth = ethers.utils.formatEther(analyticsData.totalVolume);
  // Convert ETH to USD
  const totalVolumeUsd = parseFloat(totalVolumeEth) * ethToUsdRate;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Bets</h3>
          <p className="text-3xl font-bold">{analyticsData.totalBets}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Unique Wallets</h3>
          <p className="text-3xl font-bold">{analyticsData.uniqueWallets}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Volume</h3>
          <p className="text-3xl font-bold">{totalVolumeEth} ETH</p>
          <p className="text-sm text-gray-500">(${totalVolumeUsd.toFixed(2)} USD)</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Total Bets Over Time</h3>
          <TotalBetsChart data={analyticsData.timeSeriesBets} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cumulative Unique Bettors</h3>
          <CumulativeUniqueBettorsChart data={analyticsData.timeSeriesUniqueBettors} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cumulative Wagers</h3>
          <CumulativeWagersChart data={analyticsData.timeSeriesWagers} />
        </div>
      </div>
    </div>
  );
};