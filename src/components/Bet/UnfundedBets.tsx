// components/Bet/UnfundedBets.tsx
"use client";

import React, { useState } from "react";
import { useFetchUnfundedBetDetails } from "@/hooks/useFetchUnfundedBetDetails";
import BetCard from "./BetCard";
import AlertModal from "../Common/AlertModal";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import CollapsibleSection from "../Common/CollapsibleSection";

interface UnfundedBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const UnfundedBets: React.FC<UnfundedBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const { betDetails, fetchBetDetails, loading } =
    useFetchUnfundedBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

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
            isLoading={false}
          />
        ))
      ) : (
        <div>No bets found</div>
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
