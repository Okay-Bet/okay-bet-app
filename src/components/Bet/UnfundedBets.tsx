// components/Bet/UnfundedBets.tsx
"use client";

import React, { useState } from "react";
import { useFetchUnfundedBetDetails } from "@/hooks/useFetchUnfundedBetDetails";
import BetCard from "./BetCard";
import AlertModal from "../Common/AlertModal";
import { Collapse } from "@mui/material";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";

interface UnfundedBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

const UnfundedBets: React.FC<UnfundedBetsProps> = ({ betAddresses, accountAddress }) => {
  const { betDetails, fetchBetDetails, loading } = useFetchUnfundedBetDetails(betAddresses);
  const ethToUsdRate = useFetchEthToUsdRate();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary">
      <h3 className="text-lg font-bold mb-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        Unfunded Bets
      </h3>
      <Collapse in={isOpen}>
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
      </Collapse>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          fetchBetDetails();
        }}
      />
    </div>
  );
};

export default UnfundedBets;
