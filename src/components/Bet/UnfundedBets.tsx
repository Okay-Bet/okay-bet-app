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

  const handleRefresh = async () => {
    console.log('handleRefresh called in UnfundedBets');
    for (const betAddress of betAddresses) {
      console.log(`Refreshing bet details for ${betAddress}`);
      const updatedBet = await fetchBetDetails(betAddress);
      console.log('Updated bet details:', updatedBet);
    }
  };

  useEffect(() => {
    console.log('Setting up event listener in UnfundedBets');
    eventEmitter.on('refreshUnfundedBets', handleRefresh);
    return () => {
      console.log('Cleaning up event listener in UnfundedBets');
      eventEmitter.off('refreshUnfundedBets', handleRefresh);
    };
  }, [fetchBetDetails, betAddresses]);

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
          handleRefresh(); // Refresh details when the alert is closed
        }}
      />
    </CollapsibleSection>
  );
};

export default UnfundedBets;
