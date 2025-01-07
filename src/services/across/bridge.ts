// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "../../app/client";
import { encodeFunctionData } from "viem";
import { DepositParams } from "../../components/types/bridge";
import { SPOKE_POOL_ABI } from "../../constants/spoke-pool-abi";

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

  // Type cast all address parameters to `0x${string}`
  const depositParams = [
    validateAddress(params.depositor, "depositor") as `0x${string}`,
    validateAddress(params.recipient, "recipient") as `0x${string}`,
    validateAddress(params.inputToken, "inputToken") as `0x${string}`,
    validateAddress(params.outputToken, "outputToken") as `0x${string}`,
    validateBigInt(params.inputAmount, "inputAmount"),
    validateBigInt(params.outputAmount, "outputAmount"),
    validateBigInt(params.destinationChainId.toString(), "destinationChainId"),
    validateAddress(
      params.exclusiveRelayer,
      "exclusiveRelayer"
    ) as `0x${string}`,
    Number(params.quoteTimestamp),
    fillDeadline,
    Number(params.exclusivityPeriod),
    (params.message || "0x") as `0x${string}`,
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
  console.log("[Bridge Tx] Step 1 - Initial params:", {
    spokePoolAddress,
    callDataLength: callData?.length,
    value: value.toString(),
    chainId: optimism.chainId, // Log chain ID we're working with
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

    // Get base transaction structure from thirdweb
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

    console.log("[Bridge Tx] Step 3 - Base transaction:", {
      hasBaseTx: !!baseTx,
      baseChainId: baseTx.chain?.id,
      baseGasLimit: baseTx.gasLimit?.toString(),
      baseStructure: Object.keys(baseTx),
    });

    // Construct final transaction object
    const transaction = {
      ...baseTx, // Preserve all base transaction properties
      to: spokePoolContract.address,
      data: callData,
      value: value.toString(),
      chain: optimism, // Explicitly set chain object
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
