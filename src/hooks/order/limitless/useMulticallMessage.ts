import { useCallback } from "react";
import { ethers } from "ethers";
import { MARKET_ABI } from "../../../constants/limitless/market-abi";

export const useMulticallMessage = () => {
  return useCallback(
    (
      userAddress: string,
      marketAddress: string,
      amount: bigint,
      outcomeIndex: number
    ) => {
      try {
        console.log("Generating multicall message with params:", {
          userAddress,
          marketAddress,
          amount: amount.toString(),
          outcomeIndex,
        });

        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const marketInterface = new ethers.Interface(MARKET_ABI);

        const buyCalldata = marketInterface.encodeFunctionData("buy", [
          amount,
          outcomeIndex,
          BigInt(0),
        ]);

        const instructions = {
          calls: [
            {
              target: marketAddress,
              callData: buyCalldata,
              value: 0n,
            },
          ],
          fallbackRecipient: userAddress,
          revertOnFail: false,
        };

        return abiCoder.encode(
          [
            "tuple(" +
              "tuple(address target, bytes callData, uint256 value)[] calls," +
              "address fallbackRecipient," +
              "bool revertOnFail" +
              ")",
          ],
          [instructions]
        );
      } catch (error) {
        console.error("Error generating multicall message:", error);
        throw error;
      }
    },
    []
  );
};