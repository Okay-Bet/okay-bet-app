// components/BetHistory.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useFetchBetDetails } from "@/hooks/useFetchBetDetails";
import BetCard from "../Bet/BetCard";
import BetStats from "./BetStats";
import CollapsibleSection from "../Common/CollapsibleSection";
import { BetDetailsType } from "@/components/types/bet";
import { ethers } from "ethers";

interface BetHistoryProps {
  betAddresses: string[];
  accountAddress: string;
}

interface Stats {
  betsWon: number;
  betsLost: number;
  betsDecided: number;
  betsCancelled: number;
  pnlEth: number;
  pnlUsd: number;
}

const BetHistory: React.FC<BetHistoryProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const address = accountAddress.toLowerCase();
  const { betDetails, loading, refetchAll } = useFetchBetDetails(betAddresses);
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);

  useEffect(() => {
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
    fetchEthToUsdRate();
  }, []);

  const stats = useMemo(() => {
    const calculateStats = (details: BetDetailsType[]): Stats => {
      let betsWon = 0;
      let betsLost = 0;
      let betsDecided = 0;
      let betsCancelled = 0;
      let pnlEth = 0;
      let pnlUsd = 0;

      details.forEach((betDetail) => {
        const isWinner =
          betDetail.winner &&
          betDetail.winner.toLowerCase() === address.toLowerCase();
        const isDecider =
          betDetail.judge.toLowerCase() === address.toLowerCase();
        const isMakerOrTaker =
          address.toLowerCase() === betDetail.maker.toLowerCase() ||
          address.toLowerCase() === betDetail.taker.toLowerCase();

        // Check if the bet is resolved (status 3)
        if (betDetail.status === 3) {
          const wagerEth = parseFloat(
            ethers.utils.formatEther(betDetail.totalWager)
          );
          if (isWinner) {
            betsWon += 1;
            pnlEth += wagerEth;
            pnlUsd += wagerEth * ethToUsdRate;
          } else if (isMakerOrTaker) {
            betsLost += 1;
            pnlEth -= wagerEth;
            pnlUsd -= wagerEth * ethToUsdRate;
          }
          if (isDecider) {
            betsDecided += 1;
          }
        }
        // Check if the bet is cancelled (status 4), invalidated (status 5), or expired (status 6)
        else if (
          (betDetail.status === 4 ||
            betDetail.status === 5 ||
            betDetail.status === 6) &&
          isMakerOrTaker
        ) {
          betsCancelled += 1;
        }
      });

      return { betsWon, betsLost, betsDecided, betsCancelled, pnlEth, pnlUsd };
    };

    return calculateStats(betDetails);
  }, [betDetails, address, ethToUsdRate]);

  const handleRefresh = async () => {
    await refetchAll();
  };

  return (
    <CollapsibleSection title="Bet History" loading={loading}>
      <BetStats stats={stats} />
      {betDetails.map((bet, index) => (
        <BetCard
          key={index}
          bet={bet}
          ethToUsdRate={ethToUsdRate}
          accountAddress={address}
          fetchBetDetails={refetchAll}
          setMessage={() => {}}
          setIsAlertOpen={() => {}}
          isLoading={false}
        />
      ))}
    </CollapsibleSection>
  );
};

export default BetHistory;
