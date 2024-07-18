// app/bet/[slug]/page.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import ConnectWallet from "@/components/User/ConnectWallet";
import AlertModal from "@/components/Common/AlertModal";
import BetInfo from "@/components/Bet/BetInfo";
import BetActions from "@/components/Bet/BetActions";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import { useFetchSingleBetDetails } from "@/hooks/useFetchSingleBetDetails";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split("/").pop() || null;
  const ethToUsdRate = useFetchEthToUsdRate();
  const { betDetails, loading, fetchBetDetails } = useFetchSingleBetDetails(slug);

  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  const wagerInUsd = (parseFloat(betDetails.wagerEth) * ethToUsdRate).toFixed(2);

  return (
    <div className="max-w-md mx-auto my-4 p-4 text-center min-h-screen ">
      <Navbar />
      <div className="p-4 container mx-auto">
        <ConnectWallet />
        <div className="p-4 mb-4 bg-secondary text-font shadow-md">
          <BetInfo betDetails={betDetails} wagerInUsd={wagerInUsd} />
          <BetActions
            betDetails={betDetails}
            fetchBetDetails={fetchBetDetails}
            setMessage={setMessage}
            setIsAlertOpen={setIsAlertOpen}
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
