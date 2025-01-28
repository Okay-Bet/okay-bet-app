// import { useState, useCallback } from "react";
// import { ethers } from "ethers";
// import { MARKET_ABI } from "../../../constants/limitless/market-abi";
// import { MULTICALL_HANDLER_ABI } from "../../../constants/across/multicall-handler-abi";
// import { MULTICALL_HANDLERS } from "../../../services/across/client";

// // Base network configuration
// const BASE_RPC_URL = "https://mainnet.base.org";
// const BASE_CHAIN_ID = 8453;

// interface MulticallParams {
//   userAddress: string;
//   marketAddress: string;
//   amount: bigint;
//   outcomeIndex: number;
//   usdcAddress: string;
// }

// interface CrossChainAction {
//   target: `0x${string}`;
//   callData: `0x${string}`;
//   value: bigint;
// }

// interface CrossChainMessage {
//   actions: CrossChainAction[];
//   fallbackRecipient: `0x${string}`;
// }

// const ERC20_ABI = [
//   "function approve(address spender, uint256 value) external returns (bool)",
// ];

// export const useMulticallMessage = () => {
//   const [tokenAddress, setTokenAddress] = useState<string | null>(null);
//   const provider = new ethers.JsonRpcProvider(BASE_RPC_URL, BASE_CHAIN_ID);

//   const readConditionalTokenAddress = useCallback(
//     async (marketAddress: string) => {
//       try {
//         // Create contract instance with error handling
//         if (!ethers.isAddress(marketAddress)) {
//           throw new Error("Invalid market address format");
//         }

//         const contract = new ethers.Contract(
//           marketAddress,
//           MARKET_ABI,
//           provider
//         );
//         console.log("Reading conditional tokens from market:", marketAddress);

//         const address = await contract.conditionalTokens();

//         // Validate returned address
//         if (!ethers.isAddress(address)) {
//           throw new Error(
//             "Invalid conditional token address returned from contract"
//           );
//         }

//         console.log("Found conditional token address:", address);
//         setTokenAddress(address);
//         return address;
//       } catch (error) {
//         console.error("Error reading conditional token address:", error);
//         throw new Error(
//           `Failed to read conditional token address: ${error.message}`
//         );
//       }
//     },
//     [provider]
//   );

//   return useCallback(async (params: MulticallParams): Promise<string> => {
//     try {
//       const { userAddress, marketAddress, amount, outcomeIndex, usdcAddress } =
//         params;

//       // Validate inputs
//       if (
//         !ethers.isAddress(userAddress) ||
//         !ethers.isAddress(marketAddress) ||
//         !ethers.isAddress(usdcAddress)
//       ) {
//         throw new Error("Invalid address format in parameters");
//       }

//       // Get conditional token address with caching
//       const conditionalTokenAddress =
//         tokenAddress || (await readConditionalTokenAddress(marketAddress));

//       console.log("Generating multicall message with params:", {
//         userAddress,
//         marketAddress,
//         amount: amount.toString(),
//         outcomeIndex,
//         usdcAddress,
//         conditionalTokenAddress,
//       });

//       // Create interfaces
//       const marketInterface = new ethers.Interface(MARKET_ABI);
//       const erc20Interface = new ethers.Interface(ERC20_ABI);
//       const handlerInterface = new ethers.Interface(MULTICALL_HANDLER_ABI);

//       // Three-step action sequence
//       const actions = [
//         {
//           target: usdcAddress as `0x${string}`,
//           callData: erc20Interface.encodeFunctionData("approve", [
//             marketAddress,
//             amount,
//           ]) as `0x${string}`,
//           value: BigInt(0),
//         },
//         {
//           target: marketAddress as `0x${string}`,
//           callData: marketInterface.encodeFunctionData("buy", [
//             amount,
//             outcomeIndex,
//             BigInt(0), // minOutcomeTokensToBuy
//           ]) as `0x${string}`,
//           value: BigInt(0),
//         },
//         {
//           target: MULTICALL_HANDLERS.BASE as `0x${string}`,
//           callData: handlerInterface.encodeFunctionData("drainLeftoverTokens", [
//             conditionalTokenAddress,
//             userAddress, // Assuming 1:1 ratio, adjust if different
//           ]) as `0x${string}`,
//           value: BigInt(0),
//         },
//       ];

//       // Create our message structure
//       const crossChainMessage: CrossChainMessage = {
//         actions,
//         fallbackRecipient: ethers.ZeroAddress as `0x${string}`,
//       };

//       // Convert the cross-chain message to a hex string as expected by Across
//       const abiCoder = ethers.AbiCoder.defaultAbiCoder();
//       const encodedMessage = abiCoder.encode(
//         [
//           "tuple(tuple(address target, bytes callData, uint256 value)[] actions, address fallbackRecipient)",
//         ],
//         [crossChainMessage]
//       );

//       console.log("Encoded message for Across:", encodedMessage);
//       return encodedMessage;
//     } catch (error) {
//       console.error("Error generating multicall message:", error);
//       throw error;
//     }
//   }, []);
// };

// // Example usage:
// /*
// const generateMessage = useMulticallMessage();
// const message = generateMessage({
//   userAddress: "0x...",
//   marketAddress: "0x...",
//   amount: BigInt("1000000"),
//   outcomeIndex: 1,
//   usdcAddress: "0x..."
// });
// */
