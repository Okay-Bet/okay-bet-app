// hooks/useFetchBetHistory.ts
import { useState, useEffect } from "react";
import { getContract } from "thirdweb";
import { ethers } from "ethers";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { BetDetailsType } from "@/components/types/bet";

export const useFetchBetHistory = (betAddresses: string[], address: string) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType[]>([]);
  const [stats, setStats] = useState({
    betsWon: 0,
    betsLost: 0,
    betsDecided: 0,
    pnlEth: 0,
    pnlUsd: 0,
  });
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

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

  const fetchBetDetails = async (betAddress: string): Promise<BetDetailsType | null> => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const betData = await bet({ contract: betContract });

      if (betData) {
        const [better1, better2, decider, winner] = await Promise.all([
          resolveName({ client, address: betData[0] }).catch(() => null),
          resolveName({ client, address: betData[1] }).catch(() => null),
          resolveName({ client, address: betData[2] }).catch(() => null),
          betData[6] !== "0x0000000000000000000000000000000000000000"
            ? resolveName({ client, address: betData[6] }).catch(() => null)
            : null,
        ]);

        return {
          address: betAddress,
          better1: betData[0],
          better1Display: better1 || betData[0],
          better2: betData[1],
          better2Display: better2 || betData[1],
          decider: betData[2],
          deciderDisplay: decider || betData[2],
          wagerWei: betData[3].toString(),
          wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(4), // Rounded to 4 decimals
          conditions: betData[4],
          status: betData[5],
          winner: betData[6],
          winnerDisplay: winner || betData[6],
        };
      }
    } catch (error) {
      console.error(`Error fetching bet details for ${betAddress}:`, error);
    }
    return null;
  };

  useEffect(() => {
    const fetchAllBetDetails = async () => {
      setLoading(true);
      const details: BetDetailsType[] = [];
      let betsWon = 0;
      let betsLost = 0;
      let betsDecided = 0;
      let pnlEth = 0;
      let pnlUsd = 0;

      for (const betAddress of betAddresses) {
        const betDetail = await fetchBetDetails(betAddress);
        if (betDetail) {
          details.push(betDetail);

          const isWinner = betDetail.winner?.toLowerCase() === address;
          const isDecider = betDetail.decider.toLowerCase() === address;

          if (betDetail.status === 4 || betDetail.status === 5) {
            // Resolved or Invalid status
            if (betDetail.status === 4) {
              // Only count resolved bets
              const wagerEth = parseFloat(betDetail.wagerEth);
              if (isWinner) {
                betsWon += 1;
                pnlEth += wagerEth;
                pnlUsd += wagerEth * ethToUsdRate;
              } else if (
                address === betDetail.better1.toLowerCase() ||
                address === betDetail.better2.toLowerCase()
              ) {
                betsLost += 1;
                pnlEth -= wagerEth;
                pnlUsd -= wagerEth * ethToUsdRate;
              }
            }

            if (isDecider) {
              betsDecided += 1;
            }
          }
        }
      }

      setBetDetails(details);
      setStats({ betsWon, betsLost, betsDecided, pnlEth, pnlUsd });
      setLoading(false);
    };

    fetchEthToUsdRate();
    fetchAllBetDetails();
  }, [betAddresses, address, ethToUsdRate]);

  return { betDetails, stats, ethToUsdRate, loading, fetchBetDetails };
};
