// hooks/useFetchBetDetails.ts
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { resolveName } from "thirdweb/extensions/ens";

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

export const useFetchBetDetails = (slug: string | undefined) => {
  const [betDetails, setBetDetails] = useState<BetDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

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
          wagerWei: wagerWei.toString(),
          wager: ethers.utils.formatEther(wagerWei),
          conditions: betData[4],
          status,
          winner: betData[6],
          better1Display: better1Display || "",
          better2Display: better2Display || "",
          deciderDisplay: deciderDisplay || "",
          winnerDisplay: winnerDisplay || "",
        };

        setBetDetails(details);
      }
    } catch (error) {
      console.error("Error fetching bet details:", error);
    } finally {
      setLoading(false);
    }
  };

  return { betDetails, loading, fetchBetDetails };
};
