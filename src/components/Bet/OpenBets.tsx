"use client";
import React, { useState, useEffect } from "react";
import AlertModal from "../Common/AlertModal";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import BetCard from "./BetCard";
import useWebSocket from "@/hooks/useWebSocket";

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
  const { lastEvent } = useWebSocket();

  const handleRefresh = async () => {
    for (const betAddress of betAddresses) {
      await fetchBetDetails(betAddress);
    }
  };

  useEffect(() => {
    if (lastEvent && lastEvent.type === 'BetCancelled') {
      handleRefresh();
    }
  }, [lastEvent]);

  const handleAlertClose = () => {
    setIsAlertOpen(false);
    handleRefresh(); // Refresh details when the alert is closed
  };

  // Dummy function for onProceed
  const dummyProceed = () => {};

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
        onClose={handleAlertClose}
        onProceed={dummyProceed}
        showProceed={false}
      />
    </CollapsibleSection>
  );
};

export default OpenBets;