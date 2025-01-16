// src/components/USDCApproval.tsx
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { ethers6Adapter } from "thirdweb/adapters/ethers6";
import { Contract, JsonRpcProvider, BrowserProvider } from "ethers";
import { client } from "../app/client";

// USDC Contract ABI - keeping minimal for clarity
const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

// USDC contract address on Optimism
const USDC_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";

export function USDCApproval() {
  const [isApproving, setIsApproving] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const account = useActiveAccount();

  const handleApprove = async () => {
    if (!account) {
      console.error("No active account found");
      return;
    }

    try {
      setIsApproving(true);

      // First, get the browser provider from window.ethereum
      // This is crucial - we need to use BrowserProvider for window.ethereum
      const browserProvider = new BrowserProvider(window.ethereum);
      console.log("Browser provider initialized");

      // Get the signer directly from the browser provider
      const signer = await browserProvider.getSigner();
      console.log("Signer obtained:", await signer.getAddress());

      // Create USDC contract instance with the signer
      const usdcContract = new Contract(
        USDC_ADDRESS,
        USDC_ABI,
        signer // Connect with signer directly
      );

      console.log("Contract instance created");

      // Check current allowance
      const currentAllowance = await usdcContract.allowance(
        account.address,
        account.address // Replace with actual spender address
      );

      console.log("Current allowance:", currentAllowance.toString());

      if (currentAllowance === 0n) {
        const amountInWei = 1_000_000n; // 1 USDC (6 decimals)

        console.log("Sending approval transaction...");

        // Send the approval transaction
        const tx = await usdcContract.approve(
          account.address, // Replace with actual spender address
          amountInWei,
          {
            gasLimit: 80000,
          }
        );

        console.log("Transaction sent:", tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        setTxHash(receipt?.hash || null);
        console.log("Approval successful:", receipt?.hash);
      } else {
        console.log("Already approved:", currentAllowance.toString());
      }
    } catch (error: any) {
      console.error("Approval error:", error);

      // Detailed error logging
      if (error.code) {
        console.error("Error code:", error.code);
      }
      if (error.message) {
        console.error("Error message:", error.message);
      }
      if (error.data) {
        console.error("Error data:", error.data);
      }

      alert(`Approval failed: ${error.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  if (!account) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <div>Connected: {account.address}</div>
      <button
        onClick={handleApprove}
        disabled={isApproving}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {isApproving ? "Approving..." : "Approve 1 USDC"}
      </button>
      {txHash && (
        <div className="mt-4">
          <p>Transaction submitted!</p>
          <a
            href={`https://optimistic.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on Optimism Explorer
          </a>
        </div>
      )}
    </div>
  );
}
