"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ethers } from "ethers";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client"; // Adjust the import path if necessary
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { useActiveAccount } from "thirdweb/react";
import ConnectWallet from "@/components/ConnectWallet";
import Navbar from "@/components/Navbar";
import QRCodeModal from "@/components/QRCodeModal";

const BetDetails = () => {
  const pathname = usePathname();
  const slug = pathname.split('/').pop();
  const [betDetails, setBetDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();
  const betUrl = `https://okaybet.fun/bet/${slug}`;

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
        const [better1, better2, decider, winner] = await Promise.all([
          resolveName({ client, address: betData[0] }).catch(() => betData[0]),
          resolveName({ client, address: betData[1] }).catch(() => betData[1]),
          resolveName({ client, address: betData[2] }).catch(() => betData[2]),
          betData[6] !== "0x0000000000000000000000000000000000000000"
            ? resolveName({ client, address: betData[6] }).catch(() => betData[6])
            : "Not resolved yet",
        ]);

        const details = {
          better1,
          better2,
          decider,
          wager: ethers.utils.formatEther(betData[3]),
          conditions: betData[4],
          status: betData[5],
          winner,
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-4 container mx-auto">
        <h1 className="text-3xl md:text-4xl font-heading text-secondary tracking-tighter italic mb-4">
          Bet Details
        </h1>
        <ConnectWallet />

        {account ? (
          <div className="bg-primary p-6  text-center">
            <p className="text-lg md:text-xl text-font mb-2">
              <strong>Better 1:</strong> {betDetails.better1}
            </p>
            <p className="text-lg md:text-xl text-font mb-2">
              <strong>Better 2:</strong> {betDetails.better2}
            </p>
            <p className="text-lg md:text-xl text-font mb-2">
              <strong>Decider:</strong> {betDetails.decider}
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
              <strong>Winner:</strong> {betDetails.winner}
            </p>
            <QRCodeModal url={betUrl} />
          </div>
        ) : (
          <p className="text-lg md:text-xl text-font mb-2">
            Please connect your wallet to view the bet details.
          </p>
        )}
      </div>
    </div>
  );
};

export default BetDetails;
