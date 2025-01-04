import { getContract, prepareContractCall } from "thirdweb";
import { polygon, optimism } from "thirdweb/chains";
import { client } from "@/app/client";

export const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const AGENT_WALLET_ADDRESS =
  "0x93c7c3f9394dEf62D2Ad0658c1c9b49919C13Ac5";
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates the callData string and ensures it's properly formatted
 * @throws Error if callData is invalid
 */
const validateCallData = (callData: any): string => {
  // First, log what we received
  console.log("Validating callData:", {
    value: callData,
    type: typeof callData,
    stringified: JSON.stringify(callData),
  });

  // Check if callData is defined
  if (!callData) {
    throw new Error("callData is required");
  }

  // Ensure callData is a string
  if (typeof callData !== "string") {
    throw new Error(`callData must be a string, received ${typeof callData}`);
  }

  // Remove 0x prefix if it exists and validate hex format
  const cleanHex = callData.toLowerCase().replace("0x", "");
  if (!/^[0-9a-f]*$/.test(cleanHex)) {
    throw new Error("callData must be a valid hex string");
  }

  // Return properly formatted hex string
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
    // Validate inputs
    if (!spokePoolAddress) {
      throw new Error("spokePoolAddress is required");
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(spokePoolAddress)) {
      throw new Error("Invalid spokePoolAddress format");
    }

    // Validate and format callData
    const processedCallData = validateCallData(callData);

    // Ensure value is a valid bigint
    const validValue = value || BigInt(0);

    const spokePoolContract = getContract({
      client,
      address: spokePoolAddress,
      chain: optimism,
    });

    // Add our identifier to the processed callData
    const finalCallData = `${processedCallData}1dc0def001`;

    console.log("Preparing contract call with:", {
      processedCallData,
      finalCallData,
      value: validValue.toString(),
    });

    const transaction = prepareContractCall({
      contract: spokePoolContract,
      method:
        "function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message)",
      params: [],
      overrides: {
        data: finalCallData,
        value: validValue,
      },
    });

    // Validate the resulting transaction
    if (!transaction.to || !transaction.data) {
      throw new Error("Invalid transaction generated");
    }

    console.log("Transaction prepared successfully:", {
      to: transaction.to,
      dataLength: transaction.data.length,
      value: validValue.toString(),
      chainId: transaction.chain?.id,
    });

    return transaction;
  } catch (error) {
    // Log the full error details and rethrow
    console.error("Error in prepareBridgeTransaction:", error);
    throw error;
  }
};

export const prepareUSDCTransfer = (amount: string) => {
  const usdcContract = getContract({
    client,
    address: USDC_ADDRESS,
    chain: polygon,
  });

  return prepareContractCall({
    contract: usdcContract,
    method: "function transfer(address to, uint256 amount)",
    params: [AGENT_WALLET_ADDRESS, BigInt(amount)],
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
