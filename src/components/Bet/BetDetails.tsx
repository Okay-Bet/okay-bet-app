// components/Bet/BetDetails.tsx
"use client";

import { usePathname } from "next/navigation";
import { useFetchEthToUsdRate } from "@/hooks/useFetchEthToUsdRate";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import Navbar from "@/components/Navbar";
import ConnectWallet from "@/components/User/ConnectWallet";
import BetInfo from "@/components/Bet/BetInfo";
import BetActions from "@/components/Bet/BetActions";
import AlertModal from "@/components/Common/AlertModal";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split("/").pop();
  const ethToUsdRate = useFetchEthToUsdRate();
  const { betDetails, loading, fetchBetDetails } = useFetchBetDetails(slug);

  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  const wagerInUsd = (parseFloat(betDetails.wager) * ethToUsdRate).toFixed(2);

  return (
    <div className="max-w-md mx-auto my-4 p-4 text-center min-h-screen ">
      <Navbar />
      <div className="p-4 container mx-auto">
        <ConnectWallet />
        <BetInfo betDetails={betDetails} wagerInUsd={wagerInUsd} />
        <BetActions
          betDetails={betDetails}
          fetchBetDetails={fetchBetDetails}
          setMessage={setMessage}
          setIsAlertOpen={setIsAlertOpen}
        />
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
