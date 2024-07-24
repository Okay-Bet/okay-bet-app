// components/ImmediateFundingPrompt.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { handleFundBet } from "@/utils/handleBetActions/handleFundBet";
import AlertModal from "../Common/AlertModal";
import CircularProgress from "@mui/material/CircularProgress";

interface ImmediateFundingPromptProps {
  betAddress: string;
  wagerUSD: string;
  ethToUsdRate: number;
  onComplete: (funded: boolean) => void;
  better1Address: string;
}

export const ImmediateFundingPrompt: React.FC<ImmediateFundingPromptProps> = ({
  betAddress,
  wagerUSD,
  ethToUsdRate,
  onComplete,
  better1Address,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isFundingPromptOpen, setIsFundingPromptOpen] = useState(false);
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const account = useActiveAccount();

  const handleFunding = async () => {
    if (!betAddress || !wagerUSD || !ethToUsdRate) return;
    setIsLoading(true);
    setIsFundingPromptOpen(false);
    try {
      const wagerInEth = (parseFloat(wagerUSD) / ethToUsdRate).toFixed(18);
      const wagerInWei = ethers.utils.parseEther(wagerInEth).toString();
      await handleFundBet(
        betAddress,
        wagerInWei,
        sendTransaction,
        async () => {}, // We don't need to fetch bet details here
        setMessage,
        setIsAlertOpen,
        setIsLoading
      );
      setMessage("Bet funded successfully!");
      onComplete(true);
    } catch (error) {
      console.error("Error funding bet:", error);
      setMessage("Error funding bet. Please try again.");
      onComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      account &&
      account.address.toLowerCase() === better1Address.toLowerCase() &&
      !isFundingPromptOpen &&
      !isLoading
    ) {
      setIsFundingPromptOpen(true);
    } else if (
      !account ||
      account.address.toLowerCase() !== better1Address.toLowerCase()
    ) {
      onComplete(false);
    }
  }, [account, better1Address, isFundingPromptOpen, isLoading]);

  return (
    <>
      <AlertModal
        isOpen={isFundingPromptOpen}
        message="As Better1, do you want to fund this bet now?"
        onClose={() => {
          setIsFundingPromptOpen(false);
          onComplete(false);
        }}
        actions={[
          {
            label: "Yes",
            onClick: handleFunding,
            color: "primary",
          },
          {
            label: "No",
            onClick: () => {
              setIsFundingPromptOpen(false);
              onComplete(false);
            },
            color: "secondary",
          },
        ]}
      />
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          setTimeout(() => onComplete(true), 1000);
        }}
      />
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <CircularProgress size={24} />
        </div>
      )}
    </>
  );
};