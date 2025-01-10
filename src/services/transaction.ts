import { getContract, prepareContractCall } from "thirdweb";
import { polygon, optimism } from "thirdweb/chains";
import { client } from "../app/client";
import { SPOKE_POOL_ABI } from "../constants/spoke-pool-abi";

export const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const AGENT_WALLET_ADDRESS = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || "";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const validateCallData = (callData: any): string => {
  console.log("Validating callData:", {
    value: callData,
    type: typeof callData,
    stringified: JSON.stringify(callData),
  });

  if (!callData) {
    throw new Error("callData is required");
  }

  if (typeof callData !== "string") {
    throw new Error(`callData must be a string, received ${typeof callData}`);
  }

  const cleanHex = callData.toLowerCase().replace("0x", "");
  if (!/^[0-9a-f]*$/.test(cleanHex)) {
    throw new Error("callData must be a valid hex string");
  }

  return `0x${cleanHex}`;
};

export const prepareBridgeTransaction = (
  spokePoolAddress: string,
  callData: string,
  value: bigint = BigInt(0)
) => {
  console.log("prepareBridgeTransaction input:", {
    spokePoolAddress,
    callData,
    value: value.toString(),
  });

  try {
    if (!spokePoolAddress) {
      throw new Error("spokePoolAddress is required");
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(spokePoolAddress)) {
      throw new Error("Invalid spokePoolAddress format");
    }

    const processedCallData = validateCallData(callData);
    const validValue = value || BigInt(0);

    // Initialize contract with ABI
    const spokePoolContract = getContract({
      client,
      address: spokePoolAddress,
      chain: optimism,
      abi: SPOKE_POOL_ABI, // Add the ABI here
    });

    const finalCallData = `${processedCallData}1dc0def001`;

    console.log("Preparing contract call with:", {
      processedCallData,
      finalCallData,
      value: validValue.toString(),
    });

    // Define default parameters with correct types
    const defaultParams = [
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
      "0x" as `0x${string}`
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
      params: defaultParams,
    });

    console.log("Transaction prepared successfully:", {
      to: transaction.to,
      dataLength: finalCallData.length,
      value: validValue.toString(),
      chainId: transaction.chain?.id,
    });

    return {
      ...transaction,
      to: spokePoolContract.address,
      data: finalCallData,
      value: validValue
    };
  } catch (error) {
    console.error("Error in prepareBridgeTransaction:", error);
    throw error;
  }
};

export const prepareUSDCTransfer = (amount: string) => {
  // Define USDC ABI for the transfer function
  const USDC_ABI = [{
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable"
  }] as const;

  const usdcContract = getContract({
    client,
    address: USDC_ADDRESS,
    chain: polygon,
    abi: USDC_ABI
  });

  return prepareContractCall({
    contract: usdcContract,
    method: "transfer",
    params: [AGENT_WALLET_ADDRESS, BigInt(amount)] as const,
  });
};

export const submitDelegatedOrder = async (orderData: any) => {
  const response = await fetch("/api/delegated-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.msg || errorData.detail || "Failed to submit order"
    );
  }

  return response.json();
};