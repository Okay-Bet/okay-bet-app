// utils/waitForBetReady.ts
import { getContract } from "thirdweb";
import { client, contract } from "@/app/client";
import { bet } from "@/generated/bet";
import { ethers } from "ethers";

export const waitForBetReady = async (betAddress: string, maxAttempts = 10) => {
  const betContract = getContract({
    client,
    address: betAddress,
    chain: contract.chain,
  });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const betData = await bet({ contract: betContract });
      if (betData) {
        const status = betData[6]; 
        if (status === 0) {
          return true;
        }
      }
    } catch (error) {
      console.error(`Error checking bet status for ${betAddress}:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between checks
  }
  return false;
};