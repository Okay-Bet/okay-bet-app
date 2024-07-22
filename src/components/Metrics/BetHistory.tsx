// components/Metrics/BetHistory.tsx
"use client";
import React, { useEffect } from "react";
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
  const { betDetails, stats, ethToUsdRate, loading, fetchBetDetails } =
    useFetchBetHistory(betAddresses, address);

  const handleRefresh = async () => {
    for (const betAddress of betAddresses) {
      await fetchBetDetails(betAddress);
    }
  };

  useEffect(() => {
    eventEmitter.on("refreshBetHistory", handleRefresh);
    return () => {
      eventEmitter.off("refreshBetHistory", handleRefresh);
    };
  }, [fetchBetDetails, betAddresses]);

  const defaultStats = {
    betsWon: 0,
    betsLost: 0,
    betsDecided: 0,
    pnlEth: 0,
    pnlUsd: 0,
  };

  const effectiveStats = stats || defaultStats;

  return (
    <CollapsibleSection title="Bet History" loading={loading}>
      <BetStats stats={effectiveStats} />
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
        />
      ))}
    </CollapsibleSection>
  );
};

export default BetHistory;
