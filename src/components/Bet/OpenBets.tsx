// components/Bet/OpenBets.tsx
"use client";

import React, { useState } from "react";
import AlertModal from "../Common/AlertModal";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";
import BetCard from "./BetCard";

interface OpenBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const OpenBets: React.FC<OpenBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const { betDetails, fetchBetDetails, loading } =
    useFetchBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  return (
    <CollapsibleSection title="Active Bets" loading={loading}>
      {Array.isArray(betDetails) &&
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
        ))}
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          fetchBetDetails(); // Refresh bet details without a full page reload
        }}
      />
    </CollapsibleSection>
  );
};

export default OpenBets;
