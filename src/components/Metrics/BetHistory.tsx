// components/Metrics/BetHistory.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useFetchBetHistory } from "@/hooks/useFetchBetHistory";
import BetCard from "../Bet/BetCard";
import BetStats from "./BetStats";
import CollapsibleSection from "../Common/CollapsibleSection";
import eventEmitter from "@/events/eventEmitter";

interface BetHistoryProps {
  betAddresses: string[];
  accountAddress: string;
}

const BetHistory: React.FC<BetHistoryProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const address = accountAddress.toLowerCase();
  const { betDetails, stats, ethToUsdRate, loading, fetchBetDetails } = useFetchBetHistory(betAddresses, address);

  useEffect(() => {
    const handleRefresh = () => fetchBetDetails();
    eventEmitter.on('refreshBetHistory', handleRefresh);
    return () => {
      eventEmitter.off('refreshBetHistory', handleRefresh);
    };
  }, [fetchBetDetails]);

  return (
    <CollapsibleSection title="Bet History" loading={loading}>
      <BetStats stats={stats} />
      {betDetails.map((bet, index) => (
        <BetCard
          key={index}
          bet={bet}
          ethToUsdRate={ethToUsdRate}
          accountAddress={address}
          fetchBetDetails={fetchBetDetails}
          setMessage={() => {}}
          setIsAlertOpen={() => {}}
          isLoading={false}
          refreshParent={() => {}}
        />
      ))}
    </CollapsibleSection>
  );
};

export default BetHistory;
