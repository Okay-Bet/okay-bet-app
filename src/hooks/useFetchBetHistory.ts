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

  const fetchBetDetails = async () => {
    setLoading(true);
    const details: any[] = [];
    let betsWon = 0;
    let betsLost = 0;
    let betsDecided = 0;
    let pnlEth = 0;
    let pnlUsd = 0;

    for (const betAddress of betAddresses) {
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

          const isWinner = betData[6].toLowerCase() === address;
          const isDecider = betData[2].toLowerCase() === address;

          if (betData[5] === 4 || betData[5] === 5) {
            // Resolved or Invalid status
            details.push({
              address: betAddress,
              better1: betData[0],
              better1Display: better1 || betData[0],
              better2: betData[1],
              better2Display: better2 || betData[1],
              decider: betData[2],
              deciderDisplay: decider || betData[2],
              wagerWei: betData[3].toString(),
              wagerEth: parseFloat(
                ethers.utils.formatEther(betData[3])
              ).toFixed(4), // Rounded to 4 decimals
              conditions: betData[4],
              status: betData[5],
              winner: betData[6],
              winnerDisplay: winner || betData[6],
            });

            if (betData[5] === 4) {
              // Only count resolved bets
              const wagerEth = parseFloat(
                ethers.utils.formatEther(betData[3])
              );
              if (isWinner) {
                betsWon += 1;
                pnlEth += wagerEth;
                pnlUsd += wagerEth * ethToUsdRate;
              } else if (
                address === betData[0].toLowerCase() ||
                address === betData[1].toLowerCase()
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
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
    }

    setBetDetails(details);
    setStats({ betsWon, betsLost, betsDecided, pnlEth, pnlUsd });
    setLoading(false);
  };

  useEffect(() => {
    fetchEthToUsdRate();
  }, []);

  useEffect(() => {
    fetchBetDetails();
  }, [betAddresses, address, ethToUsdRate]);

  return { betDetails, stats, ethToUsdRate, loading, fetchBetDetails };
};
