// components/BetHistory.tsx
"use client";

import React, { useState } from "react";
import { useFetchBetHistory } from "@/hooks/useFetchBetHistory";
import BetCard from "../Bet/BetCard";
import BetStats from "./BetStats";
import { Collapse } from "@mui/material";

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
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary">
      <h3
        className="text-lg font-bold mb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        Bet History
      </h3>
      <Collapse in={isOpen}>
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
      </Collapse>
    </div>
  );
};

export default BetHistory;
