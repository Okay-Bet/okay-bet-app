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
import OpenBets from "@/components/OpenBets";
import UnfundedBets from "@/components/UnfundedBets";
import BetHistory from "@/components/BetHistory";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split('/').pop();
  const [betDetails, setBetDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();

  useEffect(() => {
    if (slug) {
      fetchBetDetails(slug as string);
    }
  }, [slug]);

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

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!betDetails) {
    return <p>No bet found</p>;
  }

  const renderBetComponent = () => {
    if (betDetails.status === 0 || betDetails.status === 1 || betDetails.status === 2) {
      return (
        <UnfundedBets betAddresses={[betDetails.address]} accountAddress={account?.address || ''} />
      );
    } else if (betDetails.status === 3) {
      return (
        <OpenBets betAddresses={[betDetails.address]} accountAddress={account?.address || ''} />
      );
    } else {
      return (
        <BetHistory betAddresses={[betDetails.address]} accountAddress={account?.address || ''} />
      );
    }
  };

  return (
    <div className="min-h-screen bg-font">
      <Navbar />
      <div className="p-4 container mx-auto">
        <h1 className="text-3xl md:text-4xl font-heading text-secondary tracking-tighter italic mb-4">
          Bet Details
        </h1>
        <ConnectWallet />
        <div className="bg-quaternary p-6 rounded-lg shadow-lg text-center relative">
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Better 1:</strong> {betDetails.better1Display}
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Better 2:</strong> {betDetails.better2Display}
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Decider:</strong> {betDetails.deciderDisplay}
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Wager:</strong> {betDetails.wager} ETH
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Conditions:</strong> {betDetails.conditions}
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Status:</strong> {betDetails.status}
          </p>
          <p className="text-lg md:text-xl text-font mb-2">
            <strong>Winner:</strong> {betDetails.winnerDisplay}
          </p>
          {renderBetComponent()}
        </div>
      </div>
    </div>
  );
};

export default BetDetails;
