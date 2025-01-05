// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "@/app/client";
import { parseAbiItem, encodeFunctionData } from "viem";

// Constants
const ACROSS_IDENTIFIER = "1dc0def001";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Complete ABI including function and potential errors
const SPOKE_POOL_ABI = [
  // Main deposit function
  {
    type: "function",
    name: "depositV3",
    inputs: [
      { name: "depositor", type: "address" },
      { name: "recipient", type: "address" },
      { name: "inputToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "inputAmount", type: "uint256" },
      { name: "outputAmount", type: "uint256" },
      { name: "destinationChainId", type: "uint256" },
      { name: "exclusiveRelayer", type: "address" },
      { name: "quoteTimestamp", type: "uint32" },
      { name: "fillDeadline", type: "uint32" },
      { name: "exclusivityDeadline", type: "uint32" },
      { name: "message", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  // Common errors that might occur
  {
    type: "error",
    name: "InvalidDeposit",
    inputs: [{ name: "reason", type: "string" }],
  },
  {
    type: "error",
    name: "InvalidQuote",
    inputs: [{ name: "reason", type: "string" }],
  },
  {
    type: "error",
    name: "InvalidAmount",
    inputs: [{ name: "reason", type: "string" }],
  },
];

const ERC20_ABI = [
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

interface DepositParams {
  depositor: string;
  recipient: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  destinationChainId: number;
  exclusiveRelayer: string;
  quoteTimestamp: number;
  exclusivityDeadline: number;
  message: string;
}

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
    validateBigInt(params.exclusivityDeadline, "exclusivityDeadline"),
    params.message || "0x",
  ] as const;

  console.log("Preparing deposit call with params:", {
    ...depositParams,
    fillDeadline: fillDeadline.toString(),
  });

  // Use the full ABI for encoding
  const baseCalldata = encodeFunctionData({
    abi: SPOKE_POOL_ABI,
    args: depositParams,
    functionName: "depositV3",
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

  const validatedSpokePool = validateAddress(
    spokePoolAddress,
    "spokePoolAddress"
  );

  if (!callData || typeof callData !== "string") {
    throw new Error("Invalid callData: must be a non-empty string");
  }

  // Use the complete ABI when creating the contract instance
  const spokePoolContract = getContract({
    client,
    address: validatedSpokePool,
    chain: optimism,
    abi: SPOKE_POOL_ABI,
  });

  // These placeholder params match the ABI structure
  const placeholderParams = [
    ZERO_ADDRESS, // depositor
    ZERO_ADDRESS, // recipient
    ZERO_ADDRESS, // inputToken
    ZERO_ADDRESS, // outputToken
    BigInt(0), // inputAmount
    BigInt(0), // outputAmount
    BigInt(1), // destinationChainId
    ZERO_ADDRESS, // exclusiveRelayer
    BigInt(0), // quoteTimestamp
    BigInt(0), // fillDeadline
    BigInt(0), // exclusivityDeadline
    "0x", // message
  ] as const;

  console.log("Creating contract call with:", {
    address: validatedSpokePool,
    paramsLength: placeholderParams.length,
    callDataLength: callData.length,
    valueHex: value.toString(16),
  });

  return prepareContractCall({
    contract: spokePoolContract,
    method: "depositV3",
    params: placeholderParams,
    overrides: {
      data: callData,
      value,
    },
  });
}
