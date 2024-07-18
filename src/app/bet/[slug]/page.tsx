"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ethers } from "ethers";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import {
  bet,
  fundBet,
  cancelBet,
  resolveBet,
  invalidateBet,
} from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import ConnectWallet from "@/components/User/ConnectWallet";
import Navbar from "@/components/Navbar";
import AlertModal from "@/components/Common/AlertModal";
import ShareButton from "@/components/ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import QRCodeModal from "@/components/QRCodeModal";

interface BetDetailsType {
  address: string;
  better1: string;
  better2: string;
  decider: string;
  wagerWei: string;
  wager: string;
  conditions: string;
  status: number;
  winner: string;
  better1Display: string;
  better2Display: string;
  deciderDisplay: string;
  winnerDisplay: string;
}

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split("/").pop();
  const [betDetails, setBetDetails] = useState<BetDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
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
      const response = await fetch(
        "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
      );
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
      console.log("betData:", betData);

      if (betData) {
        const [better1, better2, decider, wagerWei, , status] = betData;
        const [better1Display, better2Display, deciderDisplay, winnerDisplay] =
          await Promise.all([
            resolveName({ client, address: better1 }).catch(() => better1),
            resolveName({ client, address: better2 }).catch(() => better2),
            resolveName({ client, address: decider }).catch(() => decider),
            betData[6] !== "0x0000000000000000000000000000000000000000"
              ? resolveName({ client, address: betData[6] }).catch(
                  () => betData[6]
                )
              : "Not resolved yet",
          ]);

        const details: BetDetailsType = {
          address: betAddress,
          better1,
          better2,
          decider,
          wagerWei: wagerWei.toString(), // Ensure wagerWei is a string
          wager: ethers.utils.formatEther(wagerWei),
          conditions: betData[4],
          status,
          winner: betData[6],
          better1Display: better1Display || "", // Default to empty string if null
          better2Display: better2Display || "", // Default to empty string if null
          deciderDisplay: deciderDisplay || "", // Default to empty string if null
          winnerDisplay: winnerDisplay || "", // Default to empty string if null
        };

        console.log("Formatted Bet Details:", details);
        setBetDetails(details);
      }
    } catch (error) {
      console.error("Error fetching bet details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFundBet = async (betAddress: string, wagerWei: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = fundBet({
        contract: betContract,
      });

      const wagerWeiBigInt = BigInt(wagerWei);
      await sendTransaction({ ...transaction, value: wagerWeiBigInt });
      setMessage("Bet funded successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(betAddress); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error funding bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error funding bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          "Error funding bet. Please try again. An unexpected error occurred."
        );
      }
      setIsAlertOpen(true);
    }
  };

  const handleCancelBet = async (betAddress: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = cancelBet({
        contract: betContract,
      });

      await sendTransaction(transaction);
      setMessage("Bet canceled successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(betAddress); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error canceling bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error canceling bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          "Error canceling bet. Please try again. An unexpected error occurred."
        );
      }
      setIsAlertOpen(true);
    }
  };

  const handleResolveBet = async (
    betAddress: string,
    winnerAddress: string
  ) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const formattedWinnerAddress = ethers.utils.getAddress(
        winnerAddress
      ) as `0x${string}`;

      const transaction = resolveBet({
        contract: betContract,
        winner: formattedWinnerAddress,
      });

      await sendTransaction(transaction);
      setMessage("Bet resolved successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(betAddress); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error resolving bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error resolving bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          "Error resolving bet. Please try again. An unexpected error occurred."
        );
      }
      setIsAlertOpen(true);
    }
  };

  const handleInvalidateBet = async (betAddress: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = invalidateBet({
        contract: betContract,
      });

      await sendTransaction(transaction);
      setMessage("Bet invalidated successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(betAddress); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error invalidating bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error invalidating bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          "Error invalidating bet. Please try again. An unexpected error occurred."
        );
      }
      setIsAlertOpen(true);
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
        return "Canceled";
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

  const getUserRole = (account: string | null, betDetails: BetDetailsType) => {
    if (!account) return "other";
    const address = account.toLowerCase();
    if (address === betDetails.better1.toLowerCase()) return "better1";
    if (address === betDetails.better2.toLowerCase()) return "better2";
    if (address === betDetails.decider.toLowerCase()) return "decider";
    return "other";
  };

  const getAvailableActions = (userRole: string, betStatus: number) => {
    const actions = [];
    if (userRole === "better1" || userRole === "better2") {
      if (betStatus === 0 || betStatus === 1 || betStatus === 2) {
        actions.push("fundBet", "cancelBet");
      }
    } else if (userRole === "decider") {
      if (betStatus === 3) {
        actions.push("resolveBet", "invalidateBet");
      }
    }
    return actions;
  };

  const userRole = getUserRole(account?.address || "", betDetails);
  const availableActions = getAvailableActions(userRole, betDetails.status);

  const wagerInUsd = (parseFloat(betDetails.wager) * ethToUsdRate).toFixed(2);

  return (
    <div className="max-w-md mx-auto my-4 p-4 text-center min-h-screen ">
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
                  : `${betDetails.better1Display.slice(
                      0,
                      6
                    )}...${betDetails.better1Display.slice(-4)}`}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Better 2:{" "}
                {betDetails.better2Display.endsWith(".eth")
                  ? betDetails.better2Display
                  : `${betDetails.better2Display.slice(
                      0,
                      6
                    )}...${betDetails.better2Display.slice(-4)}`}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Decider:{" "}
                {betDetails.deciderDisplay.endsWith(".eth")
                  ? betDetails.deciderDisplay
                  : `${betDetails.deciderDisplay.slice(
                      0,
                      6
                    )}...${betDetails.deciderDisplay.slice(-4)}`}
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
          {betDetails.status === 4 && (
            <div className="p-4 bg-tertiary text-font shadow-md">
              <span>
                Winner:{" "}
                {betDetails.winnerDisplay.endsWith(".eth")
                  ? betDetails.winnerDisplay
                  : `${betDetails.winnerDisplay.slice(
                      0,
                      6
                    )}...${betDetails.winnerDisplay.slice(-4)}`}
              </span>
            </div>
          )}
          {availableActions.includes("fundBet") && (
            <button
              onClick={() =>
                handleFundBet(betDetails.address, betDetails.wagerWei)
              }
              className="w-full p-2 bg-green-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            >
              Fund Bet
            </button>
          )}
          {availableActions.includes("cancelBet") && (
            <button
              onClick={() => handleCancelBet(betDetails.address)}
              className="w-full p-2 mb-2 bg-red-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            >
              Cancel Bet
            </button>
          )}
          {availableActions.includes("resolveBet") && (
            <button
              onClick={() =>
                handleResolveBet(betDetails.address, betDetails.winner)
              }
              className="w-full p-2 bg-blue-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            >
              Resolve Bet
            </button>
          )}
          {availableActions.includes("invalidateBet") && (
            <button
              onClick={() => handleInvalidateBet(betDetails.address)}
              className="w-full p-2 mb-2 bg-yellow-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
            >
              Invalidate Bet
            </button>
          )}
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
            <QRCodeModal
              url={`https://www.okaybet.fun/bet/${betDetails.address}`}
            />
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
