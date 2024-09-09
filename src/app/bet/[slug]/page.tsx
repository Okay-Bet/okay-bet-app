"use client";
import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import Navbar from "@/components/Common/Navbar";
import ConnectWallet from "@/components/User/ConnectWallet";
import AlertModal from "@/components/Common/AlertModal";
import BetCard from "@/components/Bet/BetCard";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split("/").pop() || "";
  const ethToUsdRate = useFetchEthToUsdRate();
  const { betDetails, loading, fetchBetDetails } = useFetchBetDetails(slug);
  const account = useActiveAccount();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  const handleFetchBetDetails = useCallback(
    async (betAddress: string) => {
      await fetchBetDetails();
      return betDetails?.[0] || null;
    },
    [fetchBetDetails, betDetails]
  );

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails || betDetails.length === 0) {
    return <p>No bet found</p>;
  }

  const bet = betDetails[0];

  const handleAlertClose = () => {
    setIsAlertOpen(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 text-center min-h-screen">
      <Navbar />
      <div className="p-4 container ">
        <ConnectWallet />
        <BetCard
          bet={bet}
          ethToUsdRate={ethToUsdRate}
          accountAddress={account?.address || ""}
          fetchBetDetails={handleFetchBetDetails}
          setMessage={setMessage}
          setIsAlertOpen={setIsAlertOpen}
          isLoading={loading}
          initialOpen={true}
          disableCollapse={true}
        />
      </div>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={handleAlertClose}
        onProceed={() => {}}
        showProceed={false}
      />
    </div>
  );
};

export default BetDetails;
