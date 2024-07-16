import { ethers } from 'ethers';
import { getContract } from 'thirdweb';
import { client, contract } from "@/app/client";
import { fundBet } from "../generated/bet";

export const handleFundBet = async (
  betAddress: string,
  wagerWei: string,
  sendTransaction: any
) => {
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
    return { success: true, message: "Bet funded successfully!" };
  } catch (error: unknown) {
    console.error("Error funding bet:", error);
    if (error instanceof Error) {
      return {
        success: false,
        message: `Error funding bet. Please try again. Details: ${error.message}`,
      };
    } else {
      return {
        success: false,
        message: `Error funding bet. Please try again. An unexpected error occurred.`,
      };
    }
  }
};
