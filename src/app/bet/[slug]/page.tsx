"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import Navbar from "@/components/Common/Navbar";
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
  const account = useActiveAccount();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const { mutateAsync: sendTransaction } = useSendTransaction();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  const handleAlertClose = () => {
    setIsAlertOpen(false);
  };

  // Dummy function to satisfy the onProceed prop requirement
  const dummyProceed = () => {};

  return (
    <div className="max-w-md mx-auto p-4 text-center min-h-screen">
      <Navbar />
      <div className="p-4 container ">
        <ConnectWallet />
        <BetCard
          bet={betDetails}
          ethToUsdRate={ethToUsdRate}
          accountAddress={account?.address || ""}
          fetchBetDetails={fetchBetDetails}
          setMessage={setMessage}
          setIsAlertOpen={setIsAlertOpen}
          isLoading={loading}
          sendTransactionProp={sendTransaction}
          initialOpen={true}
          disableCollapse={true}
        />
      </div>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={handleAlertClose}
        onProceed={dummyProceed}
        showProceed={false}
      />
    </div>
  );
};

export default BetDetails;