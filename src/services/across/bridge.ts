// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "@/app/client";
import { encodeFunctionData } from "viem";
import { DepositParams } from "../../components/types/bridge";
import { SPOKE_POOL_ABI } from "@/constants/spoke-pool-abi";

// Constants
const ACROSS_IDENTIFIER = "1dc0def001";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SPOKE_POOL_ADDRESS = "0x6f26Bf09B1C792e3228e5467807a900A503c0281";

// ERC20 minimum ABI
export const ERC20_ABI = [
  {
    type: "function" as const,
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
] as const;

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
    method: "approve",
    params: [validatedSpenderAddress, validatedAmount] as const,
  });
}

export async function generateBridgeDepositData(
  params: DepositParams,
  spokePoolAddress: string
): Promise<string> {
  console.log("Generating bridge deposit data with params:", params);

  const fillDeadline = Math.floor(Date.now() / 1000) + 3600;

  console.log("Deposit timing parameters:", {
    quoteTimestamp: params.quoteTimestamp,
    currentTime: Math.floor(Date.now() / 1000),
    fillDeadline: fillDeadline,
  });

  const depositParams = [
    validateAddress(params.depositor, "depositor"),
    validateAddress(params.recipient, "recipient"),
    validateAddress(params.inputToken, "inputToken"),
    validateAddress(params.outputToken, "outputToken"),
    validateBigInt(params.inputAmount, "inputAmount"),
    validateBigInt(params.outputAmount, "outputAmount"),
    validateBigInt(params.destinationChainId.toString(), "destinationChainId"),
    validateAddress(params.exclusiveRelayer, "exclusiveRelayer"),
    Number(params.quoteTimestamp), // Explicitly convert to number
    fillDeadline, // Already a number
    Number(params.exclusivityPeriod), // Explicitly convert to number
    (params.message || "0x") as `0x${string}`, // Type assertion for hex string
  ] as const;

  console.log("Preparing deposit call with params:", {
    ...depositParams,
    fillDeadline: fillDeadline,
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

    const spokePoolContract = getContract({
      client,
      address: validatedSpokePool,
      chain: optimism,
      abi: SPOKE_POOL_ABI,
    });

    if (!spokePoolContract || !spokePoolContract.abi) {
      throw new Error("Failed to initialize spoke pool contract or ABI");
    }

    // Define the correct parameter types for depositV3
    const depositParams = [
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      BigInt(0),
      BigInt(0),
      BigInt(1),
      ZERO_ADDRESS,
      0,
      0,
      0,
      "0x" as `0x${string}`,
    ] as const satisfies readonly [
      string,
      string,
      string,
      string,
      bigint,
      bigint,
      bigint,
      string,
      number,
      number,
      number,
      `0x${string}`
    ];

    const transaction = prepareContractCall({
      contract: spokePoolContract,
      method: "depositV3",
      params: depositParams,
    });

    // Log available methods and transaction details
    console.log("Contract instance check:", {
      address: spokePoolContract.address,
      hasABI: true,
      availableMethods: spokePoolContract.abi
        .filter((item) => "type" in item && item.type === "function")
        .map((item) => {
          const functionItem = item as { type: "function"; name: string };
          return functionItem.name;
        }),
    });

    console.log("Transaction preparation details:", {
      contractAddress: spokePoolContract.address,
      method: "depositV3",
      hasData: true,
      dataLength: callData.length,
      fullTransaction: {
        to: transaction.to,
        value: value.toString(),
      },
    });

    // Return modified transaction with custom calldata
    return {
      ...transaction,
      to: spokePoolContract.address,
      data: callData,
      value,
    };
  } catch (error) {
    console.error("Bridge transaction preparation failed:", {
      error,
      errorName: error instanceof Error ? error.name : "Unknown Error",
      errorMessage: error instanceof Error ? error.message : String(error),
      spokePool: spokePoolAddress,
      callDataLength: callData?.length,
    });
    throw error;
  }
}

export async function isRouteEnabled(
  spokePoolContract: any,
  inputToken: string,
  destinationChainId: number
): Promise<boolean> {
  try {
    const isEnabled = await spokePoolContract.enabledDepositRoutes(
      inputToken,
      destinationChainId
    );
    console.log("Route status check:", {
      inputToken,
      destinationChainId,
      isEnabled,
    });
    return isEnabled;
  } catch (error) {
    console.error("Failed to check route status:", error);
    return false;
  }
}
