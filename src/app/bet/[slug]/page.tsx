"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import Navbar from "@/components/Navbar";
import ConnectWallet from "@/components/User/ConnectWallet";
import AlertModal from "@/components/Common/AlertModal";
import BetCard from "@/components/Bet/BetCard";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import { useFetchSingleBetDetails } from "@/hooks/useFetchSingleBetDetails";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split("/").pop() || null;
  const ethToUsdRate = useFetchEthToUsdRate();
  const { betDetails, loading, fetchBetDetails } = useFetchSingleBetDetails(slug);
  const account = useActiveAccount(); // Get the active account

  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  return (
    <div className="max-w-md mx-auto my-4 p-4 text-center min-h-screen">
      <Navbar />
      <div className="p-4 container mx-auto">
        <ConnectWallet />
        <div className="p-4 mb-4 bg-secondary text-font shadow-md">
          <BetCard
            bet={betDetails}
            ethToUsdRate={ethToUsdRate}
            accountAddress={account?.address || ""} // Use the account address here
            fetchBetDetails={fetchBetDetails}
            setMessage={setMessage}
            setIsAlertOpen={setIsAlertOpen}
            isLoading={loading}
          />
        </div>
      </div>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
};

export default BetDetails;
