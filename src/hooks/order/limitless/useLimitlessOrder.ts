// import { useState, useCallback } from "react";
// import { useActiveAccount } from "thirdweb/react";
// import {
//   getAcrossClient,
//   SPOKE_POOL,
//   MULTICALL_HANDLERS,
//   SUPPORTED_TOKENS,
// } from "../../../services/across/client";
// import { OrderRequest } from "../../../components/types";
// import { useMulticallMessage } from "./useMulticallMessage";
// import { useTokenApproval } from "./useTokenApproval";
// import { useBridgeTransaction } from "./useBridgeTransaction";
// import { BridgeStep } from "../../../components/types";

// // Constants for retry and timing configurations
// const RETRY_DELAYS = [15000, 30000, 60000];
// const FILL_CHECK_INTERVAL = 5000;
// const MAX_FILL_WAIT_TIME = 180000;

// interface FillStatus {
//   status: "pending" | "filled" | "failed";
//   message?: string;
// }

// interface QuoteParams {
//   multicallMessage: string;
//   amountBigInt: bigint;
// }

// // Using simpler types that match Across SDK expectations
// interface GetQuoteParams {
//   route: {
//     originChainId: number;
//     destinationChainId: number;
//     inputToken: string;
//     outputToken: string;
//     isNative?: boolean;
//   };
//   inputAmount: string | bigint;
//   recipient?: string;
//   crossChainMessage?: string;
// }

// export const useLimitlessOrder = () => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [quote, setQuote] = useState<any | null>(null);
//   const account = useActiveAccount();
//   const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
//     step: "approval",
//     status: "pending",
//   });

//   const generateMessageForMulticallHandler = useMulticallMessage();
//   const { handleTokenApproval } = useTokenApproval();
//   const { handleBridgeTransaction } = useBridgeTransaction();

//   const sleep = (ms: number) =>
//     new Promise((resolve) => setTimeout(resolve, ms));

//   const fetchQuote = async ({
//     multicallMessage,
//     amountBigInt,
//   }: QuoteParams) => {
//     try {
//       console.log("Initiating quote fetch with params:", {
//         inputAmount: amountBigInt.toString(),
//         crossChainMessage: multicallMessage,
//       });

//       const acrossClient = getAcrossClient();

//       // Construct quote parameters with simpler types
//       const quoteParams: GetQuoteParams = {
//         route: {
//           originChainId: 10, // Optimism
//           destinationChainId: 8453, // Base
//           inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC,
//           outputToken: SUPPORTED_TOKENS.BASE.USDC,
//           isNative: false,
//         },
//         inputAmount: amountBigInt.toString(),
//         recipient: MULTICALL_HANDLERS.BASE,
//         crossChainMessage: multicallMessage,
//       };

//       console.log("Requesting quote with params:", {
//         ...quoteParams,
//         inputAmount: quoteParams.inputAmount.toString(),
//       });

//       const quoteResponse = await acrossClient.getQuote(quoteParams);

//       console.log("Quote received:", {
//         inputAmount: quoteResponse.deposit.inputAmount.toString(),
//         outputAmount: quoteResponse.deposit.outputAmount.toString(),
//         estimatedFillTime: quoteResponse.estimatedFillTimeSec,
//         fees: quoteResponse.fees,
//       });

//       return quoteResponse;
//     } catch (error) {
//       console.error("Quote fetch error details:", {
//         error,
//         stack: error instanceof Error ? error.stack : undefined,
//         message: error instanceof Error ? error.message : "Unknown error",
//       });
//       throw new Error(
//         `Failed to fetch quote: ${
//           error instanceof Error ? error.message : "Unknown error"
//         }`
//       );
//     }
//   };

//   // Fill status checking with improved error handling
//   const checkFillStatus = async (txHash: string): Promise<FillStatus> => {
//     try {
//       const response = await fetch(
//         `https://across.to/api/deposit-status?transactionHash=${txHash}`
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.filled) return { status: "filled" };
//       if (data.failed || data.cancelled) {
//         return {
//           status: "failed",
//           message: data.message || "Fill failed or cancelled",
//         };
//       }
//       return { status: "pending" };
//     } catch (error) {
//       console.error("Error checking fill status:", error);
//       return { status: "pending" };
//     }
//   };

//   // Wait for fill with timeout and logging
//   const waitForFill = async (txHash: string): Promise<boolean> => {
//     const startTime = Date.now();
//     while (Date.now() - startTime < MAX_FILL_WAIT_TIME) {
//       const status = await checkFillStatus(txHash);
//       if (status.status === "filled") return true;
//       if (status.status === "failed") {
//         console.warn(`Fill failed: ${status.message}`);
//         return false;
//       }
//       await sleep(FILL_CHECK_INTERVAL);
//     }
//     return false;
//   };

//   const submitOrder = useCallback(
//     async (orderRequest: OrderRequest) => {
//       if (!account) {
//         throw new Error("Wallet not connected");
//       }

//       setIsLoading(true);
//       setError(null);

//       try {
//         console.log("Proceeding with Limitless order flow");

//         // Step 1: Prepare multicall message
//         setBridgeStep({ step: "preparing", status: "processing" });
//         const amountBigInt = BigInt(orderRequest.amount);

//         const multicallMessage = await generateMessageForMulticallHandler({
//           userAddress: account.address,
//           marketAddress: orderRequest.tokenId,
//           amount: amountBigInt,
//           outcomeIndex: orderRequest.isYesToken ? 1 : 0,
//           usdcAddress: SUPPORTED_TOKENS.BASE.USDC,
//         });

//         // Step 2: Get initial quote before approval
//         console.log("Requesting initial quote...");
//         const initialQuote = await fetchQuote({
//           multicallMessage,
//           amountBigInt,
//         });
//         console.log("Initial quote received:", initialQuote);
//         setQuote(initialQuote);

//         // Step 3: Handle token approval
//         setBridgeStep({ step: "approval", status: "processing" });
//         await handleTokenApproval(
//           SUPPORTED_TOKENS.OPTIMISM.USDC,
//           SPOKE_POOL.OPTIMISM,
//           amountBigInt.toString()
//         );

//         // Step 4: Bridge transaction with retries
//         setBridgeStep({ step: "bridging", status: "processing" });

//         let bridgeResult;
//         for (let i = 0; i <= RETRY_DELAYS.length; i++) {
//           try {
//             // Get fresh quote for each attempt
//             const freshQuote = await fetchQuote({
//               multicallMessage,
//               amountBigInt,
//             });

//             bridgeResult = await handleBridgeTransaction(
//               freshQuote.deposit,
//               SPOKE_POOL.OPTIMISM,
//               multicallMessage
//             );

//             const filled = await waitForFill(bridgeResult.hash);
//             if (filled) {
//               setBridgeStep({ step: "completed", status: "success" });
//               return bridgeResult;
//             }

//             console.warn(`Attempt ${i + 1} failed to fill, retrying...`);
//           } catch (error) {
//             console.error(`Bridge attempt ${i + 1} failed:`, error);
//             if (i === RETRY_DELAYS.length) throw error;
//           }

//           if (i < RETRY_DELAYS.length) {
//             await sleep(RETRY_DELAYS[i]);
//           }
//         }

//         throw new Error("Bridge transaction failed after all retry attempts");
//       } catch (err) {
//         const errorMessage =
//           err instanceof Error ? err.message : "Unknown error occurred";
//         console.error("Order submission error:", errorMessage);
//         setError(errorMessage);
//         setBridgeStep({
//           step: bridgeStep.step,
//           status: "failed",
//         });
//         throw new Error(errorMessage);
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [
//       account,
//       generateMessageForMulticallHandler,
//       handleTokenApproval,
//       handleBridgeTransaction,
//     ]
//   );

//   return {
//     submitOrder,
//     isLoading,
//     error,
//     bridgeStep,
//     quote,
//   };
// };
