// hooks/useFetchBetHistory.ts
import { useState, useEffect, useCallback } from "react";
import { getContract } from "thirdweb";
import { ethers } from "ethers";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { BetDetailsType } from "@/components/types/bet";
import { resolveUserAddress } from "./useResolveUserAddress";
import useWebSocket from "@/hooks/useWebSocket";

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
  const { lastEvent } = useWebSocket();

  const fetchEthToUsdRate = useCallback(async () => {
    try {
      const response = await fetch(
        "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
      );
      const data = await response.json();
      setEthToUsdRate(data.USD);
    } catch (error) {
      console.error("Error fetching ETH to USD rate:", error);
    }
  }, []);

  const fetchBetDetails = useCallback(async () => {
    setLoading(true);
    const details: BetDetailsType[] = [];
    let betsWon = 0;
    let betsLost = 0;
    let betsDecided = 0;
    let pnlEth = 0;
    let pnlUsd = 0;

    for (const betAddress of betAddresses) {
      const betDetail = await fetchSingleBetDetails(betAddress);
      if (betDetail) {
        details.push(betDetail);

        const isWinner =
          betDetail.winner &&
          betDetail.winner.toLowerCase() === address.toLowerCase();
        const isDecider =
          betDetail.decider.toLowerCase() === address.toLowerCase();

        if (betDetail.status === 4 || betDetail.status === 5) {
          if (betDetail.status === 4) {
            const wagerEth = parseFloat(betDetail.wagerEth);
            if (isWinner) {
              betsWon += 1;
              pnlEth += wagerEth;
              pnlUsd += wagerEth * ethToUsdRate;
            } else if (
              address.toLowerCase() === betDetail.better1.toLowerCase() ||
              address.toLowerCase() === betDetail.better2.toLowerCase()
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
  }, [betAddresses, address, ethToUsdRate]);

  const fetchSingleBetDetails = useCallback(
    async (betAddress: string): Promise<BetDetailsType | null> => {
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const betData = await bet({ contract: betContract });

        if (betData) {
          const [better1, better2, decider, winner] = await Promise.all([
            resolveUserAddress(betData[0]),
            resolveUserAddress(betData[1]),
            resolveUserAddress(betData[2]),
            betData[6] !== "0x0000000000000000000000000000000000000000"
              ? resolveUserAddress(betData[6])
              : { address: null, displayName: null },
          ]);

          const betDetail: BetDetailsType = {
            address: betAddress,
            better1: betData[0],
            better1Display: better1.displayName,
            better2: betData[1],
            better2Display: better2.displayName,
            decider: betData[2],
            deciderDisplay: decider.displayName,
            wagerWei: betData[3].toString(),
            wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(
              4
            ),
            conditions: betData[4],
            status: betData[5],
            winner:
              betData[6] !== "0x0000000000000000000000000000000000000000"
                ? betData[6]
                : null,
            winnerDisplay: winner.displayName,
          };

          return betDetail;
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
      return null;
    },
    []
  );

  useEffect(() => {
    fetchEthToUsdRate();
    fetchBetDetails();
  }, [fetchEthToUsdRate, fetchBetDetails]);

  useEffect(() => {
    if (
      lastEvent &&
      (lastEvent.type === "betCancelled" ||
        lastEvent.type === "betResolved" ||
        lastEvent.type === "betInvalidated")
    ) {
      const updatedBetAddress = lastEvent.betAddress;
      if (betAddresses.includes(updatedBetAddress)) {
        fetchSingleBetDetails(updatedBetAddress).then((updatedBetDetail) => {
          if (updatedBetDetail) {
            setBetDetails((prevDetails) =>
              prevDetails.map((detail) =>
                detail.address === updatedBetAddress ? updatedBetDetail : detail
              )
            );
            // Recalculate stats
            fetchBetDetails();
          }
        });
      }
    }
  }, [lastEvent, fetchSingleBetDetails, fetchBetDetails, betAddresses]);

  return { 
    betDetails, 
    stats, 
    ethToUsdRate, 
    loading, 
    fetchSingleBetDetails,
    fetchBetDetails
  };
};
