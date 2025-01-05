// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "@/app/client";
import { parseAbiItem, encodeFunctionData } from "viem";
import { DepositParams } from "../../components/types/bridge";
import { SPOKE_POOL_ABI } from "@/constants/spoke-pool-abi";

// Constants
const ACROSS_IDENTIFIER = "1dc0def001";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SPOKE_POOL_ADDRESS = "0x6f26Bf09B1C792e3228e5467807a900A503c0281";

// ERC20 minimum ABI
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Validation utilities
const validateAddress = (address: string, paramName: string): string => {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid ${paramName}: ${address}`);
  }
  return address.toLowerCase();
};

const validateBigInt = (value: string | bigint, paramName: string): bigint => {
  try {
    return BigInt(value);
  } catch (error) {
    throw new Error(
      `Invalid ${paramName}: ${value}. Must be a valid numeric value.`
    );
  }
};

const validateQuoteTimestamp = (timestamp: number): void => {
  const currentTime = Math.floor(Date.now() / 1000);
  const BUFFER = 300; // 5 minutes buffer
  if (timestamp < currentTime - BUFFER || timestamp > currentTime) {
    throw new Error("Quote timestamp must be within 5 minutes of current time");
  }
};

const validateFillDeadline = (deadline: number): void => {
  const currentTime = Math.floor(Date.now() / 1000);
  if (deadline <= currentTime) {
    throw new Error("Fill deadline must be in the future");
  }
};

const appendIdentifier = (calldata: string): string => {
  const cleanCalldata = calldata.startsWith("0x")
    ? calldata.slice(2)
    : calldata;
  return `0x${cleanCalldata}${ACROSS_IDENTIFIER}`;
};

export function prepareTokenApproval(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
) {
  console.log("Preparing token approval:", {
    tokenAddress,
    spenderAddress,
    amount,
  });

  const validatedTokenAddress = validateAddress(tokenAddress, "tokenAddress");
  const validatedSpenderAddress = validateAddress(
    spenderAddress,
    "spenderAddress"
  );
  const validatedAmount = validateBigInt(amount, "amount");

  const tokenContract = getContract({
    client,
    address: validatedTokenAddress,
    chain: optimism,
    abi: ERC20_ABI,
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount)",
    params: [validatedSpenderAddress, validatedAmount],
  });
}

export async function generateBridgeDepositData(
  params: DepositParams,
  spokePoolAddress: string
): Promise<string> {
  console.log("Generating bridge deposit data with params:", params);

  const fillDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  console.log("Deposit timing parameters:", {
    quoteTimestamp: params.quoteTimestamp,
    currentTime: Math.floor(Date.now() / 1000),
    fillDeadline: fillDeadline.toString(),
  });

  const depositParams = [
    validateAddress(params.depositor, "depositor"),
    validateAddress(params.recipient, "recipient"),
    validateAddress(params.inputToken, "inputToken"),
    validateAddress(params.outputToken, "outputToken"),
    validateBigInt(params.inputAmount, "inputAmount"),
    validateBigInt(params.outputAmount, "outputAmount"),
    validateBigInt(params.destinationChainId, "destinationChainId"),
    validateAddress(params.exclusiveRelayer, "exclusiveRelayer"),
    validateBigInt(params.quoteTimestamp, "quoteTimestamp"),
    fillDeadline,
    validateBigInt(params.exclusivityPeriod, "exclusivityPeriod"), // Updated parameter name
    params.message || "0x",
  ] as const;

  console.log("Preparing deposit call with params:", {
    ...depositParams,
    fillDeadline: fillDeadline.toString(),
  });

  const baseCalldata = encodeFunctionData({
    abi: SPOKE_POOL_ABI,
    functionName: "depositV3",
    args: depositParams,
  });

  const finalCalldata = appendIdentifier(baseCalldata);

  console.log("Calldata details:", {
    baseLength: baseCalldata.length,
    finalLength: finalCalldata.length,
    identifier: ACROSS_IDENTIFIER,
  });

  return finalCalldata;
}

export function prepareBridgeTransaction(
  spokePoolAddress: string,
  callData: string,
  value: bigint = BigInt(0)
) {
  console.log("Preparing bridge transaction:", {
    spokePoolAddress,
    callDataLength: callData?.length,
    value: value.toString(),
  });

  try {
    const validatedSpokePool = validateAddress(
      spokePoolAddress,
      "spokePoolAddress"
    );

    if (!callData || typeof callData !== "string") {
      throw new Error("Invalid callData: must be a non-empty string");
    }

    // Log the full calldata for debugging
    console.log("Raw calldata:", callData);

    // Use the complete ABI when creating the contract instance
    const spokePoolContract = getContract({
      client,
      address: validatedSpokePool,
      chain: optimism,
      abi: SPOKE_POOL_ABI,
    });

    const transaction = prepareContractCall({
      contract: spokePoolContract,
      method: "depositV3",
      params: [
        ZERO_ADDRESS, // These will be overridden by callData
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        BigInt(0),
        BigInt(0),
        BigInt(1),
        ZERO_ADDRESS,
        BigInt(0),
        BigInt(0),
        BigInt(0),
        "0x",
      ] as const,
      overrides: {
        data: callData,
        value,
      },
    });

    // Safe logging of transaction details
    console.log("Final transaction:", {
      to: transaction.to,
      dataLength: transaction.data ? transaction.data.length : 0,
      value: transaction.value?.toString(),
      chain: transaction.chain?.id,
    });

    return transaction;
  } catch (error) {
    console.error("Bridge transaction preparation failed:", error);
    // Add detailed error logging
    if ((error as any).code === "CALL_EXCEPTION") {
      const errorData = (error as any).data;
      console.log("Contract error data:", errorData);
      // Try to decode the error if possible
      try {
        const errorInterface = new Interface(SPOKE_POOL_ABI);
        const decodedError = errorInterface.parseError(errorData);
        console.log("Decoded error:", decodedError);
      } catch (decodeError) {
        console.log("Could not decode error:", errorData);
      }
    }
    throw error;
  }
}
