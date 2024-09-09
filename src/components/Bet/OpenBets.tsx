"use client";
import React, { useState, useEffect, useCallback } from "react";
import AlertModal from "../Common/AlertModal";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import BetCard from "./BetCard";
import useWebSocket from "@/hooks/useWebSocket";
import { BetDetailsType } from "@/components/types/bet";

interface OpenBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const OpenBets: React.FC<OpenBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const { betDetails, loading, fetchBetDetails, refetchAll } =
    useFetchBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const { lastEvent, emitEvent } = useWebSocket();

  useEffect(() => {
    if (lastEvent && lastEvent.type === "BetCancelled") {
      refetchAll();
    }
  }, [lastEvent, refetchAll]);

  const handleAlertClose = () => {
    setIsAlertOpen(false);
    refetchAll();
  };

  const fetchBetDetailsWrapper = useCallback(
    async (betAddress: string): Promise<BetDetailsType | null> => {
      await fetchBetDetails();
      return betDetails.find((bet) => bet.address === betAddress) || null;
    },
    [fetchBetDetails, betDetails]
  );

  return (
    <CollapsibleSection title="Open Bets" loading={loading}>
      {Array.isArray(betDetails) && betDetails.length > 0 ? (
        betDetails.map((bet, index) => (
          <BetCard
            key={bet.address || index}
            bet={bet}
            ethToUsdRate={ethToUsdRate}
            accountAddress={accountAddress}
            fetchBetDetails={fetchBetDetailsWrapper}
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
        onProceed={() => {}}
        showProceed={false}
      />
    </CollapsibleSection>
  );
};

export default OpenBets;
