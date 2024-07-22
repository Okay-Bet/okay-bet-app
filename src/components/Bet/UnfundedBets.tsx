// components/Bet/UnfundedBets.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useFetchUnfundedBetDetails } from "@/hooks/useFetchUnfundedBetDetails";
import BetCard from "./BetCard";
import AlertModal from "../Common/AlertModal";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import eventEmitter from "@/events/eventEmitter";

interface UnfundedBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const UnfundedBets: React.FC<UnfundedBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const { betDetails, fetchBetDetails, loading } = useFetchUnfundedBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleRefresh = () => fetchBetDetails();
    eventEmitter.on('refreshUnfundedBets', handleRefresh);
    return () => {
      eventEmitter.off('refreshUnfundedBets', handleRefresh);
    };
  }, [fetchBetDetails]);

  return (
    <CollapsibleSection title="Unfunded Bets" loading={loading}>
      {betDetails.length > 0 ? (
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
            refreshParent={() => {}}
          />
        ))
      ) : (
        <div>No unfunded bets found</div>
      )}
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          fetchBetDetails();
        }}
      />
    </CollapsibleSection>
  );
};

export default UnfundedBets;
