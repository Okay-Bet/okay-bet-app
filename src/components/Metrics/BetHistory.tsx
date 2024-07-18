// components/BetHistory.tsx
"use client";

import React, { useState } from "react";
import { useFetchBetHistory } from "@/hooks/useFetchBetHistory";
import BetCard from "../Bet/BetCard";
import BetStats from "./BetStats";
import CollapsibleSection from "../Common/CollapsibleSection";

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
        />
      ))}
    </CollapsibleSection>
  );
};

export default BetHistory;
