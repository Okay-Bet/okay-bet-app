"use client";
import React, { useState, useEffect } from "react";
import { useFetchBetDetails, BetDetailsType } from "@/hooks/useFetchBetDetails";
import BetCard from "./BetCard";
import AlertModal from "../Common/AlertModal";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import useWebSocket from "@/hooks/useWebSocket";

interface UnfundedBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const UnfundedBets: React.FC<UnfundedBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  console.log("UnfundedBets component rendered with addresses:", betAddresses);
  const { betDetails, loading, fetchBetDetails, refetchAll } =
    useFetchBetDetails(betAddresses, true);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const { lastEvent } = useWebSocket();

  console.log("Bet details received in UnfundedBets:", betDetails);
  console.log("Loading state:", loading);

  useEffect(() => {
    if (
      lastEvent &&
      (lastEvent.type === "BetFunded" || lastEvent.type === "BetCancelled")
    ) {
      console.log("Refetching due to event:", lastEvent);
      refetchAll();
    }
  }, [lastEvent, refetchAll]);

  const handleAlertClose = () => {
    setIsAlertOpen(false);
    refetchAll();
  };

  console.log("All bet details:", betDetails);
  const unfundedBets = betDetails.filter(
    (bet) => bet.status === 0 || bet.status === 1
  );
  console.log("Filtered unfunded bets:", unfundedBets);

  return (
    <CollapsibleSection title="Unfunded Bets" loading={loading}>
      {loading ? (
        <div>Loading...</div>
      ) : unfundedBets.length > 0 ? (
        unfundedBets.map((bet, index) => (
          <BetCard
            key={bet.address || index}
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
        <div>No unfunded bets found</div>
      )}
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={handleAlertClose}
        onProceed={() => {}}
        showProceed={false}
      />
    </CollapsibleSection>
  );
};

export default UnfundedBets;
