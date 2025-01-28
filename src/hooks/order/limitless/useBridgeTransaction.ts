// import { useState } from "react";
// import { useSendTransaction, useActiveAccount } from "thirdweb/react";
// import { getContract, prepareContractCall } from "thirdweb";
// import { optimism } from "thirdweb/chains";
// import { client } from "../../../app/client";
// import { SPOKE_POOL_ABI } from "../../../constants/spoke-pool-abi";
// import { sleep } from "../../../services/transaction";
// import { BridgeStep } from "../../../components/types";

// const validateBridgeParameters = (deposit: any) => {
//   console.log("Validating bridge parameters:", deposit);
  
//   // Remove the exclusivityDeadline check since it can be 0
//   if (!deposit.quoteTimestamp) {
//     throw new Error("Missing quote timestamp");
//   }

//   if (!deposit.inputAmount || !deposit.outputAmount) {
//     throw new Error("Missing amount parameters");
//   }

//   if (!deposit.inputToken || !deposit.outputToken) {
//     throw new Error("Missing token addresses");
//   }

//   if (!deposit.recipient) {
//     throw new Error("Missing recipient address");
//   }

//   console.log("Bridge parameters validation passed");
// };

// export const useBridgeTransaction = () => {
//   const { mutateAsync: sendTransaction } = useSendTransaction();
//   const account = useActiveAccount();
//   const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
//     step: "bridging",
//     status: "pending",
//   });

//   const handleBridgeTransaction = async (
//     deposit: any,
//     spokePoolAddress: string,
//     multicallMessage: string
//   ) => {
//     if (!account) {
//       throw new Error("No active account found");
//     }

//     console.log("=== Starting Bridge Transaction ===");
//     console.log("Deposit parameters:", deposit);

//     try {
//       // Validate parameters before proceeding
//       validateBridgeParameters(deposit);

//       const spokePoolContract = getContract({
//         client,
//         chain: optimism,
//         address: spokePoolAddress as `0x${string}`,
//         abi: SPOKE_POOL_ABI,
//       });

//       console.log("Got spoke pool contract:", spokePoolAddress);

//       // Convert numeric values to appropriate types
//       const inputAmount = BigInt(deposit.inputAmount);
//       const outputAmount = BigInt(deposit.outputAmount);
//       const destinationChainId = BigInt(deposit.destinationChainId);
//       const quoteTimestamp = Number(deposit.quoteTimestamp);
//       const fillDeadline = Math.floor(Date.now() / 1000) + 3600;
//       // Accept 0 as valid for exclusivityDeadline
//       const exclusivityDeadline = Number(deposit.exclusivityDeadline);

//       const params = [
//         account.address, // depositor
//         deposit.recipient,
//         deposit.inputToken,
//         deposit.outputToken,
//         inputAmount,
//         outputAmount,
//         destinationChainId,
//         deposit.exclusiveRelayer,
//         quoteTimestamp,
//         fillDeadline,
//         exclusivityDeadline,
//         multicallMessage,
//       ];

//       console.log("=== Prepared Parameters ===", {
//         depositor: account.address,
//         recipient: deposit.recipient,
//         inputToken: deposit.inputToken,
//         outputToken: deposit.outputToken,
//         inputAmount: inputAmount.toString(),
//         outputAmount: outputAmount.toString(),
//         destinationChainId: destinationChainId.toString(),
//         exclusiveRelayer: deposit.exclusiveRelayer,
//         quoteTimestamp,
//         fillDeadline,
//         exclusivityDeadline,
//         messageLength: multicallMessage.length,
//         params: params // Log the actual parameters being sent
//       });

//       console.log("Preparing contract call...");
//       const rawBridgeTx = prepareContractCall({
//         contract: spokePoolContract,
//         method: "depositV3",
//         params,
//       });

//       console.log("Contract call prepared, getting data...");
//       const bridgeTx = {
//         ...rawBridgeTx,
//         data: await rawBridgeTx.data(),
//       };

//       console.log("=== Prepared Bridge Transaction ===", {
//         tx: bridgeTx,
//       });

//       setBridgeStep({
//         step: "bridging",
//         status: "pending",
//       });

//       return new Promise((resolve, reject) => {
//         console.log("Sending transaction...");
//         sendTransaction(bridgeTx, {
//           onSuccess: async (result) => {
//             try {
//               console.log("Bridge transaction sent:", result);

//               setBridgeStep({
//                 step: "bridging",
//                 status: "pending",
//                 txHash: result.transactionHash,
//               });

//               await sleep(15000);
//               console.log("Bridge transaction confirmed");

//               setBridgeStep({
//                 step: "bridging",
//                 status: "success",
//                 txHash: result.transactionHash,
//               });

//               resolve(result);
//             } catch (error) {
//               console.error("Bridge confirmation failed:", error);
//               setBridgeStep({
//                 step: "bridging",
//                 status: "failed",
//               });
//               reject(error);
//             }
//           },
//           onError: (error) => {
//             console.error("Bridge transaction failed:", error);
//             setBridgeStep({
//               step: "bridging",
//               status: "failed",
//             });
//             reject(error);
//           },
//         });
//       });
//     } catch (error) {
//       console.error("Bridge preparation failed:", error);
//       setBridgeStep({
//         step: "bridging",
//         status: "failed",
//       });
//       throw error;
//     }
//   };

//   return {
//     handleBridgeTransaction,
//     bridgeStep,
//   };
// };