// // hooks/token/useUSDCApproval.ts
// import { useState } from "react";
// import { useSendAndConfirmTransaction } from "thirdweb/react";
// import { getContract, prepareContractCall } from "thirdweb";
// import { base } from "thirdweb/chains";
// import { client } from "../../app/client";
// import { BridgeStep } from "../../components/types";

// // Base chain USDC address
// const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// // Standard ERC20 approval interface
// const ERC20_ABI = [
//   {
//     constant: false,
//     inputs: [
//       { name: "spender", type: "address" },
//       { name: "amount", type: "uint256" },
//     ],
//     name: "approve",
//     outputs: [{ name: "", type: "bool" }],
//     payable: false,
//     stateMutability: "nonpayable" as const,
//     type: "function" as const,
//   },
// ];

// /**
//  * Hook for handling USDC approvals on Base network
//  * Returns approval handler and step status for UI feedback
//  */
// export const useUSDCApproval = () => {
//   const { mutateAsync: sendAndConfirmTx } = useSendAndConfirmTransaction();
//   const [approvalStep, setApprovalStep] = useState<BridgeStep>({
//     step: "approval",
//     status: "pending",
//   });

//   const handleUSDCApproval = async (
//     spenderAddress: string, // Contract that will spend the USDC
//     amount: string | number // Amount to approve in USDC base units (6 decimals)
//   ) => {
//     console.log("Preparing USDC approval:", {
//       usdcAddress: BASE_USDC_ADDRESS,
//       spender: spenderAddress,
//       amount,
//     });

//     try {
//       // Get USDC contract instance
//       const usdcContract = getContract({
//         client,
//         chain: base,
//         address: BASE_USDC_ADDRESS,
//         abi: ERC20_ABI,
//       });

//       // Prepare approval transaction
//       const approvalTx = prepareContractCall({
//         contract: usdcContract,
//         method: "function approve(address spender, uint256 amount)",
//         params: [spenderAddress, BigInt(amount.toString())]
//       });

//       setApprovalStep({
//         step: "approval",
//         status: "pending",
//       });

//       // Send approval transaction
//       const receipt = await sendAndConfirmTx(approvalTx as unknown as Parameters<typeof sendAndConfirmTx>[0]);
//       console.log("Approval confirmed:", receipt.transactionHash);

//       setApprovalStep({
//         step: "approval",
//         status: "success",
//         txHash: receipt.transactionHash,
//       });

//       // Wait for confirmation
//       console.log("USDC approval confirmed:", receipt.transactionHash);
//     } catch (error) {
//       console.error("USDC approval failed:", error);
//       setApprovalStep({
//         step: "approval",
//         status: "failed",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//       throw error;
//     }
//   };

//   return {
//     handleUSDCApproval,
//     approvalStep,
//   };
// };
