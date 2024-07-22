// components/Bet/OpenBets.tsx
"use client";
import React, { useState, useEffect } from "react";
import AlertModal from "../Common/AlertModal";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import BetCard from "./BetCard";
import eventEmitter from "@/events/eventEmitter";

interface OpenBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const OpenBets: React.FC<OpenBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const { betDetails, fetchBetDetails, loading } = useFetchBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const handleRefresh = async () => {
    for (const betAddress of betAddresses) {
      await fetchBetDetails(betAddress);
    }
  };

  useEffect(() => {
    eventEmitter.on("refreshOpenBets", handleRefresh);
    return () => {
      eventEmitter.off("refreshOpenBets", handleRefresh);
    };
  }, [fetchBetDetails, betAddresses]);

  return (
    <CollapsibleSection title="Open Bets" loading={loading}>
      {Array.isArray(betDetails) && betDetails.length > 0 ? (
        betDetails.map((bet, index) => (
          <BetCard
            key={index}
            bet={bet}
            ethToUsdRate={ethToUsdRate}
            accountAddress={accountAddress}
            fetchBetDetails={fetchBetDetails}
            setMessage={setMessage}
            setIsAlertOpen={setIsAlertOpen}
            isLoading={loading}
          />
        ))
      ) : (
        <div>No open bets found</div>
      )}
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          handleRefresh(); // Refresh details when the alert is closed
        }}
      />
    </CollapsibleSection>
  );
};

export default OpenBets;
