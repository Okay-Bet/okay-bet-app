import React from 'react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useFetchEthToUsdRate } from '@/hooks/useFetchEthToUsdRate';
import { ethers } from 'ethers';

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
    <div>
      <h2>Analytics Dashboard</h2>
      <div>
        <p>Total Bets: {analyticsData.totalBets}</p>
        <p>Unique Wallets: {analyticsData.uniqueWallets}</p>
        <p>Total Volume: {totalVolumeEth} ETH (${totalVolumeUsd.toFixed(2)} USD)</p>
      </div>
    </div>
  );
};