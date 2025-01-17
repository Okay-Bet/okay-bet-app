import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "../../app/client";
import { encodeFunctionData } from "viem";
import { DepositParams } from "../../components/types/bridge";
import { SPOKE_POOL_ABI } from "../../constants/spoke-pool-abi";

// === Constants ===
const ACROSS_IDENTIFIER = "1dc0def001";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// === Timing and Validation Constants ===
const FILL_DEADLINE_BUFFER = 3600; // 1 hour in seconds
const MAX_QUOTE_AGE = 300; // 5 minutes in seconds
const MIN_EXCLUSIVITY_PERIOD = 60; // 1 minute minimum
const MAX_EXCLUSIVITY_PERIOD = 86400; // 24 hours maximum

const OPTIMISM_CHAIN_ID = Number(optimism.id);

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

// Define our transaction interface to match thirdweb's expected structure
interface BridgeTransaction {
  to: string;
  data: string;
  value: string;
  chain: typeof optimism;
}

// === Validation Utilities ===
const validateAddress = (address: string, paramName: string): string => {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid ${paramName}: ${address}`);
  }
  return address.toLowerCase();
};

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

  validateQuoteTimestamp(params.quoteTimestamp);

  const exclusiveRelayer = validateRelayerAddress(params.exclusiveRelayer);
  let adjustedExclusivityPeriod = 0;

  if (exclusiveRelayer !== ZERO_ADDRESS) {
    adjustedExclusivityPeriod = Math.min(
      Math.max(Number(params.exclusivityPeriod), MIN_EXCLUSIVITY_PERIOD),
      MAX_EXCLUSIVITY_PERIOD
    );
  }

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
    exclusiveRelayer as `0x${string}`,
    Number(params.quoteTimestamp),
    fillDeadline,
    adjustedExclusivityPeriod,
    (params.message || "0x") as `0x${string}`,
  ] as const;

  const baseCalldata = encodeFunctionData({
    abi: SPOKE_POOL_ABI,
    functionName: "depositV3",
    args: depositParams,
  });

  return appendIdentifier(baseCalldata);
}

export function prepareBridgeTransaction(
  spokePoolAddress: string,
  callData: string,
  value: bigint = BigInt(0)
): BridgeTransaction {
  console.log("[Bridge Tx] Step 1 - Initial params:", {
    spokePoolAddress,
    callDataLength: callData?.length,
    value: value.toString(),
    chainId: OPTIMISM_CHAIN_ID,
  });

  try {
    const validatedSpokePool = validateAddress(
      spokePoolAddress,
      "spokePoolAddress"
    );

    // We still get the contract for validation purposes
    const spokePoolContract = getContract({
      client,
      address: validatedSpokePool,
      chain: optimism,
      abi: SPOKE_POOL_ABI,
    });

    // Create the transaction directly without using prepareContractCall
    const transaction: BridgeTransaction = {
      to: validatedSpokePool,
      data: callData,
      value: value.toString(),
      chain: optimism,
    };

    console.log("[Bridge Tx] Step 2 - Final transaction:", {
      to: transaction.to,
      hasData: !!transaction.data,
      dataLength: transaction.data?.length,
      chainId: OPTIMISM_CHAIN_ID,
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
