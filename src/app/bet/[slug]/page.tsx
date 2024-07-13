"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ethers } from "ethers";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client"; 
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { useActiveAccount } from "thirdweb/react";
import ConnectWallet from "@/components/ConnectWallet";
import Navbar from "@/components/Navbar";
import AlertModal from "@/components/AlertModal";
import ShareButton from "@/components/ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split('/').pop();
  const [betDetails, setBetDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);

  useEffect(() => {
    if (slug) {
      fetchBetDetails(slug as string);
      fetchEthToUsdRate();
    }
  }, [slug]);

  const fetchEthToUsdRate = async () => {
    try {
      const response = await fetch("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD");
      const data = await response.json();
      setEthToUsdRate(data.USD);
    } catch (error) {
      console.error("Error fetching ETH to USD rate:", error);
    }
  };

  const fetchBetDetails = async (betAddress: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const betData = await bet({ contract: betContract });
      console.log('betData:', betData);

      if (betData) {
        const [better1, better2, decider, , , status] = betData;
        const [better1Display, better2Display, deciderDisplay, winnerDisplay] = await Promise.all([
          resolveName({ client, address: better1 }).catch(() => better1),
          resolveName({ client, address: better2 }).catch(() => better2),
          resolveName({ client, address: decider }).catch(() => decider),
          betData[6] !== "0x0000000000000000000000000000000000000000"
            ? resolveName({ client, address: betData[6] }).catch(() => betData[6])
            : "Not resolved yet",
        ]);

        const details = {
          address: betAddress,
          better1,
          better2,
          decider,
          wager: ethers.utils.formatEther(betData[3]),
          conditions: betData[4],
          status,
          winner: betData[6],
          better1Display,
          better2Display,
          deciderDisplay,
          winnerDisplay,
        };

        console.log('Formatted Bet Details:', details);
        setBetDetails(details);
      }
    } catch (error) {
      console.error('Error fetching bet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBetStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Unfunded";
      case 1:
        return "Partially Funded (Better 1 has funded)";
      case 2:
        return "Partially Funded (Better 2 has funded)";
      case 3:
        return "Open";
      case 4:
        return "Resolved";
      case 5:
        return "Invalidated";
      default:
        return "Unknown Status";
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  const wagerInUsd = (parseFloat(betDetails.wager) * ethToUsdRate).toFixed(2);

  return (
    <div className="max-w-md mx-auto my-4 p-4 min-h-screen ">
      <Navbar />
      <div className="p-4 container mx-auto">
        <ConnectWallet />
        <div className="p-4 mb-4 bg-secondary text-font shadow-md">
          <h4 className="text-xl font-bold mb-2 text-font">
            {betDetails.conditions}
          </h4>
          <div className="grid grid-cols-1 gap-4 mb-2">
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Better 1:{" "}
                {betDetails.better1Display.endsWith(".eth")
                  ? betDetails.better1Display
                  : `${betDetails.better1Display.slice(0, 6)}...${betDetails.better1Display.slice(-4)}`}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Better 2:{" "}
                {betDetails.better2Display.endsWith(".eth")
                  ? betDetails.better2Display
                  : `${betDetails.better2Display.slice(0, 6)}...${betDetails.better2Display.slice(-4)}`}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Decider:{" "}
                {betDetails.deciderDisplay.endsWith(".eth")
                  ? betDetails.deciderDisplay
                  : `${betDetails.deciderDisplay.slice(0, 6)}...${betDetails.deciderDisplay.slice(-4)}`}
              </span>
            </div>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
            ${wagerInUsd} USD ({betDetails.wager} ETH)
          </div>
          <div className="mb-2 mt-2">
            <span className="inline-block px-4 py-2 bg-tertiary text-font">
              {getBetStatusText(betDetails.status)}
            </span>
          </div>
          <div className="flex justify-end items-center space-x-4 mt-2">
            <ShareButton
              better1Display={betDetails.better1Display}
              better2Display={betDetails.better2Display}
              deciderDisplay={betDetails.deciderDisplay}
              wagerEth={betDetails.wager}
              status={betDetails.status}
              conditions={betDetails.conditions}
              ethToUsdRate={ethToUsdRate}
              address={betDetails.address}
            />
            <Link href={`/bet/${betDetails.address}`} passHref legacyBehavior>
              <a className="text-primary hover:text-quaternary cursor-pointer mt-1">
                <OpenInNewIcon />
              </a>
            </Link>
          </div>
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
