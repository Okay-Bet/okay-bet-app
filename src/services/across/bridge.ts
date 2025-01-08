// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "../../app/client";
import { encodeFunctionData } from "viem";
import { DepositParams } from "../../components/types/bridge";
import { SPOKE_POOL_ABI } from "../../constants/spoke-pool-abi";

// === Constants ===
const ACROSS_IDENTIFIER = "1dc0def001";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SPOKE_POOL_ADDRESS = "0x6f26Bf09B1C792e3228e5467807a900A503c0281";

// === NEW: Timing and Validation Constants ===
const FILL_DEADLINE_BUFFER = 3600; // 1 hour in seconds
const MAX_QUOTE_AGE = 300; // 5 minutes in seconds
const MIN_EXCLUSIVITY_PERIOD = 60; // 1 minute minimum
const MAX_EXCLUSIVITY_PERIOD = 86400; // 24 hours maximum

// ERC20 minimum ABI (unchanged)
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

// === Validation Utilities ===
const validateAddress = (address: string, paramName: string): string => {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid ${paramName}: ${address}`);
  }
  return address.toLowerCase();
};

// NEW: Enhanced relayer validation
const validateRelayerAddress = (address: string | null | undefined): string => {
  if (!address) {
    console.log("No exclusive relayer specified, using zero address");
    return ZERO_ADDRESS;
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    console.warn("Invalid relayer address format, using zero address");
    return ZERO_ADDRESS;
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
  if (currentTime - timestamp > MAX_QUOTE_AGE) {
    throw new Error(
      `Quote has expired. Maximum age is ${MAX_QUOTE_AGE} seconds`
    );
  }
};

const appendIdentifier = (calldata: string): string => {
  const cleanCalldata = calldata.startsWith("0x")
    ? calldata.slice(2)
    : calldata;
  return `0x${cleanCalldata}${ACROSS_IDENTIFIER}`;
};

// === Core Functions ===
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

  const currentTime = Math.floor(Date.now() / 1000);
  const fillDeadline = currentTime + FILL_DEADLINE_BUFFER;

  // Validate quote timestamp
  if (currentTime - params.quoteTimestamp > MAX_QUOTE_AGE) {
    throw new Error(
      `Quote has expired. Maximum age is ${MAX_QUOTE_AGE} seconds`
    );
  }

  // Handle exclusive relayer and exclusivity period
  const exclusiveRelayer = validateRelayerAddress(params.exclusiveRelayer);
  let adjustedExclusivityPeriod = 0; // Start with 0 and adjust only if needed

  // CRITICAL: Only set exclusivity period if we have a valid relayer
  if (exclusiveRelayer !== ZERO_ADDRESS) {
    adjustedExclusivityPeriod = Math.min(
      Math.max(Number(params.exclusivityPeriod), MIN_EXCLUSIVITY_PERIOD),
      MAX_EXCLUSIVITY_PERIOD
    );
  }

  // IMPORTANT: Add explicit timing validation
  if (fillDeadline <= currentTime + adjustedExclusivityPeriod) {
    throw new Error(
      `Invalid timing parameters: fillDeadline (${fillDeadline}) must be greater than currentTime (${currentTime}) + exclusivityPeriod (${adjustedExclusivityPeriod})`
    );
  }

  console.log("Deposit timing parameters:", {
    quoteTimestamp: params.quoteTimestamp,
    currentTime,
    fillDeadline,
    exclusivityPeriod: adjustedExclusivityPeriod,
    exclusiveRelayer,
    timingValidation: {
      isValid: fillDeadline > currentTime + adjustedExclusivityPeriod,
      buffer: fillDeadline - (currentTime + adjustedExclusivityPeriod),
    },
  });

  const depositParams = [
    validateAddress(params.depositor, "depositor") as `0x${string}`,
    validateAddress(params.recipient, "recipient") as `0x${string}`,
    validateAddress(params.inputToken, "inputToken") as `0x${string}`,
    validateAddress(params.outputToken, "outputToken") as `0x${string}`,
    validateBigInt(params.inputAmount, "inputAmount"),
    validateBigInt(params.outputAmount, "outputAmount"),
    validateBigInt(params.destinationChainId.toString(), "destinationChainId"),
    exclusiveRelayer as `0x${string}`, // Use validated relayer address
    Number(params.quoteTimestamp),
    fillDeadline,
    adjustedExclusivityPeriod,
    (params.message || "0x") as `0x${string}`,
  ] as const;

  console.log("Preparing deposit call with params:", {
    ...depositParams,
    fillDeadline,
    adjustedExclusivityPeriod,
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

// UPDATED: Enhanced bridge transaction preparation
export function prepareBridgeTransaction(
  spokePoolAddress: string,
  callData: string,
  value: bigint = BigInt(0)
) {
  console.log("[Bridge Tx] Step 1 - Initial params:", {
    spokePoolAddress,
    callDataLength: callData?.length,
    value: value.toString(),
    chainId: optimism.chainId,
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

    console.log("[Bridge Tx] Step 2 - Contract instance:", {
      contractAddress: spokePoolContract.address,
      hasChain: !!spokePoolContract.chain,
      chainId: spokePoolContract.chain?.id,
      contractType: typeof spokePoolContract,
    });

    // Get base transaction structure
    const baseTx = prepareContractCall({
      contract: spokePoolContract,
      method: "depositV3",
      params: [
        ZERO_ADDRESS as `0x${string}`,
        ZERO_ADDRESS as `0x${string}`,
        ZERO_ADDRESS as `0x${string}`,
        ZERO_ADDRESS as `0x${string}`,
        BigInt(0),
        BigInt(0),
        BigInt(1),
        ZERO_ADDRESS as `0x${string}`,
        0,
        0,
        0,
        "0x" as `0x${string}`,
      ] as const,
    });

    // Construct final transaction object with validated parameters
    const transaction = {
      ...baseTx,
      to: spokePoolContract.address,
      data: callData,
      value: value.toString(),
      chain: optimism,
      overrides: {
        ...baseTx.overrides,
        data: callData,
        value: value.toString(),
      },
    };

    console.log("[Bridge Tx] Step 4 - Final transaction:", {
      hasChain: !!transaction.chain,
      chainId: transaction.chain?.id,
      hasData: !!transaction.data,
      dataLength: transaction.data?.length,
      structure: Object.keys(transaction),
    });

    return transaction;
  } catch (error) {
    console.error("[Bridge Tx] Failed:", {
      error,
      errorName: error instanceof Error ? error.name : "Unknown Error",
      errorMessage: error instanceof Error ? error.message : String(error),
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
