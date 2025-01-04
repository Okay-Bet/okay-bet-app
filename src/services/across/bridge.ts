// src/services/across/bridge.ts
import { getContract, prepareContractCall } from "thirdweb";
import { optimism } from "thirdweb/chains";
import { client } from "@/app/client";
import { parseAbiItem } from "viem";

// We keep Viem's parseAbiItem for better type safety in our definitions
const DEPOSIT_V3_ABI = parseAbiItem(
  "function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external payable"
);

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

export function prepareTokenApproval(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
) {
  const tokenContract = getContract({
    client,
    address: tokenAddress,
    chain: optimism,
    abi: ERC20_ABI,
  });

  return prepareContractCall({
    contract: tokenContract,
    method: "function approve(address spender, uint256 amount)",
    params: [spenderAddress, BigInt(amount)],
  });
}

export async function generateBridgeDepositData(
  params: DepositParams,
  spokePoolAddress: string
): Promise<string> {
  const depositContract = getContract({
    client,
    address: spokePoolAddress,
    chain: optimism,
    abi: [DEPOSIT_V3_ABI],
  });

  const depositParams = [
    params.depositor,
    params.recipient,
    params.inputToken,
    params.outputToken,
    BigInt(params.inputAmount),
    BigInt(params.outputAmount),
    BigInt(params.destinationChainId),
    params.exclusiveRelayer,
    BigInt(params.quoteTimestamp),
    BigInt(Math.floor(Date.now() / 1000) + 3600), // fillDeadline: 1 hour from now
    BigInt(params.exclusivityDeadline),
    params.message || "0x",
  ] as const;

  const { request } = await prepareContractCall({
    contract: depositContract,
    method: "depositV3",
    params: depositParams,
    value: BigInt(0),
  });

  return request.data;
}
