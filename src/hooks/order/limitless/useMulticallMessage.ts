import { useCallback } from "react";
import { ethers } from "ethers";
import { MARKET_ABI } from "../../../constants/limitless/market-abi";

interface MulticallParams {
  userAddress: string;
  marketAddress: string;
  amount: bigint;
  outcomeIndex: number;
  usdcAddress: string;
}

interface CrossChainAction {
  target: `0x${string}`;
  callData: `0x${string}`;
  value: bigint;
}

interface CrossChainMessage {
  actions: CrossChainAction[];
  fallbackRecipient: `0x${string}`;
}

const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
];

export const useMulticallMessage = () => {
  return useCallback((params: MulticallParams): string => {
    try {
      const { userAddress, marketAddress, amount, outcomeIndex, usdcAddress } =
        params;

      // Validate inputs
      if (!ethers.isAddress(marketAddress) || !ethers.isAddress(usdcAddress)) {
        throw new Error("Invalid address format");
      }

      console.log("Generating multicall message with params:", {
        userAddress,
        marketAddress,
        amount: amount.toString(),
        outcomeIndex,
        usdcAddress,
      });

      // Create interfaces
      const marketInterface = new ethers.Interface(MARKET_ABI);
      const erc20Interface = new ethers.Interface(ERC20_ABI);

      // Create our structured actions
      const actions = [
        {
          target: usdcAddress as `0x${string}`,
          callData: erc20Interface.encodeFunctionData("approve", [
            marketAddress,
            amount,
          ]) as `0x${string}`,
          value: BigInt(0),
        },
        {
          target: marketAddress as `0x${string}`,
          callData: marketInterface.encodeFunctionData("buy", [
            amount,
            outcomeIndex,
            BigInt(0),
          ]) as `0x${string}`,
          value: BigInt(0),
        },
      ];

      // Create our message structure
      const crossChainMessage: CrossChainMessage = {
        actions,
        fallbackRecipient: ethers.ZeroAddress as `0x${string}`,
      };

      // Convert the cross-chain message to a hex string as expected by Across
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedMessage = abiCoder.encode(
        [
          "tuple(tuple(address target, bytes callData, uint256 value)[] actions, address fallbackRecipient)",
        ],
        [crossChainMessage]
      );

      console.log("Encoded message for Across:", encodedMessage);
      return encodedMessage;
    } catch (error) {
      console.error("Error generating multicall message:", error);
      throw error;
    }
  }, []);
};

// Example usage:
/*
const generateMessage = useMulticallMessage();
const message = generateMessage({
  userAddress: "0x...",
  marketAddress: "0x...",
  amount: BigInt("1000000"),
  outcomeIndex: 1,
  usdcAddress: "0x..."
});
*/
