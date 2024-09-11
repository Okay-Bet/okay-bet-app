import { ethers } from "ethers";
import { transferFrom } from "thirdweb/extensions/erc20";

const USDC_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export async function getUSDCBalance(
  address: string,
  usdcContractAddress: string,
  provider: ethers.providers.Provider
): Promise<ethers.BigNumber> {
  try {
    const usdcContract = new ethers.Contract(
      usdcContractAddress,
      USDC_ABI,
      provider
    );
    const balance = await usdcContract.balanceOf(address);
    return balance;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    throw error;
  }
}

export async function approveUSDC(
  spender: string,
  amount: ethers.BigNumber,
  usdcContractAddress: string,
  signer: ethers.Signer
): Promise<void> {
  try {
    const usdcContract = new ethers.Contract(
      usdcContractAddress,
      USDC_ABI,
      signer
    );
    const tx = await usdcContract.approve(spender, amount);
    await tx.wait();
  } catch (error) {
    console.error("Error approving USDC:", error);
    throw error;
  }
}

export async function transferUSDC(
  from: string,
  to: string,
  amount: bigint,
  usdcContractAddress: string
): Promise<void> {
  try {
    const transaction = transferFrom({
      contract: usdcContractAddress as any,
      from,
      to,
      amount: amount.toString(),
    });
    await (transaction as any).execute();
  } catch (error) {
    console.error("Error transferring USDC:", error);
    throw error;
  }
}

// Helper function to format USDC amount for display (optional)
export function formatUSDC(amount: ethers.BigNumber): string {
  return ethers.utils.formatUnits(amount, 6); // USDC has 6 decimal places
}
