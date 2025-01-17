import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../app/client";
import { optimism } from "thirdweb/chains";
import { ethers } from "ethers";
import { OrderRequest, AcrossQuote } from "../../components/types";
import {
  getAcrossClient,
  getAcrossQuote,
  getTokenAddress,
  SUPPORTED_CHAINS,
  SPOKE_POOL,
  MULTICALL_HANDLERS,
  SUPPORTED_TOKENS,
} from "../../services/across/client";
import {
  prepareTokenApproval,
  prepareBridgeTransaction,
  generateBridgeDepositData,
} from "../../services/across/bridge";
import { sleep } from "../../services/transaction";
import { SPOKE_POOL_ABI } from "../../constants/spoke-pool-abi";

// Contract addresses
const MARKET_FACTORY_ADDRESS = "0xc397D5d70cb3B56B26dd5C2824d49a96c4dabF50";
const CONDITIONAL_TOKENS_ADDRESS = "0xC9c98965297Bc527861c898329Ee280632B76e18";

// Token addresses
const OPTIMISM_USDC = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const BASE_USDC = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA";

// ABI for USDC approval
const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
];

interface BridgeStep {
  step: "approval" | "bridging";
  status: "pending" | "success" | "failed";
  txHash?: string;
}

// Define the ABI of the functions
const CONDITIONAL_TOKENS_ABI = [
  "function approve(address spender, uint256 value)",
  "function balanceOf(address owner, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)",
];

const MARKET_FACTORY_ABI = [
  "function buyOutcome(uint256 outcomeIndex, uint256 amount) returns (uint256)",
  "function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) view returns (uint256)",
  "function getConditionalTokens() view returns (address)",
  "function getFee() view returns (uint256)",
];
interface LimitlessOrderHookReturn {
  submitOrder: (orderRequest: OrderRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface PreparedTransactionBase {
  to: string;
  value?: bigint | string;
  overrides?: {
    data?: string;
    value?: bigint;
    [key: string]: any;
  };
}

// Add a transaction normalizer
const normalizeTxValue = (
  transaction: PreparedTransactionBase
): PreparedTransactionBase => {
  const normalizedTx: PreparedTransactionBase = { ...transaction };

  // Convert main value if it exists
  if (typeof normalizedTx.value === "string") {
    normalizedTx.value = BigInt(normalizedTx.value);
  }

  // Convert overrides value if it exists
  if (
    normalizedTx.overrides?.value &&
    typeof normalizedTx.overrides.value === "string"
  ) {
    normalizedTx.overrides = {
      ...normalizedTx.overrides,
      value: BigInt(normalizedTx.overrides.value),
    };
  }

  return normalizedTx;
};

export const useLimitlessOrder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useActiveAccount();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const generateMessageForMulticallHandler = useCallback(
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

        // Create Interface instances
        const conditionalTokensInterface = new ethers.Interface(
          CONDITIONAL_TOKENS_ABI
        );
        const marketFactoryInterface = new ethers.Interface(MARKET_FACTORY_ABI);

        // First, approve the market to spend conditional tokens
        const approveCalldata = conditionalTokensInterface.encodeFunctionData(
          "approve",
          [marketAddress, amount]
        );

        // Then execute the buy
        const buyCalldata = marketFactoryInterface.encodeFunctionData(
          "buyOutcome",
          [outcomeIndex, amount]
        );

        // Encode the Instructions object for the multicall handler
        return abiCoder.encode(
          [
            "tuple(" +
              "tuple(" +
              "address target," +
              "bytes callData," +
              "uint256 value" +
              ")[]," +
              "address fallbackRecipient" +
              ")",
          ],
          [
            [
              [
                [CONDITIONAL_TOKENS_ADDRESS, approveCalldata, 0],
                [marketAddress, buyCalldata, 0],
              ],
              userAddress,
            ],
          ]
        );
      } catch (error) {
        console.error("Error generating multicall message:", error);
        throw error;
      }
    },
    []
  );

  const handleTokenApproval = async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ) => {
    console.log("Preparing USDC approval with:", {
      tokenAddress,
      spenderAddress,
      amount,
    });

    try {
      const approvalTx = prepareTokenApproval(
        tokenAddress,
        spenderAddress,
        amount
      );

      console.log("Approval transaction prepared:", approvalTx);

      const result = await sendTransaction(approvalTx);
      console.log("Approval transaction sent:", result);

      // Wait for confirmation
      setBridgeStep({
        step: "approval",
        status: "pending",
        txHash: result.hash,
      });

      await sleep(15000); // Wait for confirmation

      setBridgeStep({
        step: "approval",
        status: "success",
        txHash: result.hash,
      });

      return result;
    } catch (error) {
      console.error("Token approval failed:", error);
      setBridgeStep({
        step: "approval",
        status: "failed",
      });
      throw error;
    }
  };

  const handleBridgeTransaction = async (
    deposit: any,
    spokePoolAddress: string,
    multicallMessage: string
  ) => {
    console.log("=== Starting Bridge Transaction ===");
    console.log("Deposit parameters:", deposit);

    try {
      const spokePoolContract = getContract({
        client,
        chain: optimism,
        address: spokePoolAddress as `0x${string}`,
        abi: SPOKE_POOL_ABI,
      });

      // Convert numeric values to appropriate types
      const inputAmount = BigInt(deposit.inputAmount);
      const outputAmount = BigInt(deposit.outputAmount);
      const destinationChainId = BigInt(deposit.destinationChainId);
      const quoteTimestamp = Number(deposit.quoteTimestamp); // uint32
      const fillDeadline = Math.floor(Date.now() / 1000) + 3600; // uint32, 1 hour from now
      const exclusivityDeadline = Number(deposit.exclusivityDeadline); // uint32

      console.log("=== Prepared Parameters ===", {
        depositor: account!.address,
        recipient: deposit.recipient,
        inputToken: deposit.inputToken,
        outputToken: deposit.outputToken,
        inputAmount: inputAmount.toString(),
        outputAmount: outputAmount.toString(),
        destinationChainId: destinationChainId.toString(),
        exclusiveRelayer: deposit.exclusiveRelayer,
        quoteTimestamp,
        fillDeadline,
        exclusivityDeadline,
        messageLength: multicallMessage.length,
      });

      const rawBridgeTx = prepareContractCall({
        contract: spokePoolContract,
        method: "depositV3",
        params: [
          account!.address, // depositor
          deposit.recipient,
          deposit.inputToken,
          deposit.outputToken,
          inputAmount,
          outputAmount,
          destinationChainId,
          deposit.exclusiveRelayer,
          quoteTimestamp,
          fillDeadline,
          exclusivityDeadline,
          multicallMessage,
        ],
      });

      // Resolve the transaction data
      const bridgeTx = {
        ...rawBridgeTx,
        data: await rawBridgeTx.data(),
      };

      console.log("=== Prepared Bridge Transaction ===", {
        tx: bridgeTx,
      });

      setBridgeStep({
        step: "bridging",
        status: "pending",
      });

      return new Promise((resolve, reject) => {
        sendTransaction(bridgeTx, {
          onSuccess: async (result) => {
            try {
              console.log("Bridge transaction sent:", result);

              setBridgeStep({
                step: "bridging",
                status: "pending",
                txHash: result.transactionHash,
              });

              await sleep(15000);
              console.log("Bridge transaction confirmed");

              setBridgeStep({
                step: "bridging",
                status: "success",
                txHash: result.transactionHash,
              });

              resolve(result);
            } catch (error) {
              console.error("Bridge confirmation failed:", error);
              reject(error);
            }
          },
          onError: (error) => {
            console.error("Bridge transaction failed:", error);
            setBridgeStep({
              step: "bridging",
              status: "failed",
            });
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error("Bridge preparation failed:", error);
      setBridgeStep({
        ...bridgeStep,
        status: "failed",
      });
      throw error;
    }
  }; 

  // Update the submitOrder function to pass the multicall message
  const submitOrder = useCallback(
    async (orderRequest: OrderRequest) => {
      console.log("useLimitlessOrder: Received order request:", orderRequest);

      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const acrossClient = getAcrossClient();

        // 1. Generate multicall instructions
        const amountBigInt = BigInt(orderRequest.amount);
        const multicallMessage = generateMessageForMulticallHandler(
          account.address,
          orderRequest.tokenId,
          amountBigInt,
          orderRequest.isYesToken ? 1 : 0
        );

        console.log(
          "Generated multicall message:",
          multicallMessage as `0x${string}`
        );

        const crossChainMessage = {
          actions: [
            {
              target: MULTICALL_HANDLERS.BASE as `0x${string}`,
              callData: multicallMessage as `0x${string}`,
              value: BigInt(0),
            },
          ],
          fallbackRecipient: account.address as `0x${string}`,
        };

        // 2. Get Across quote with the multicall message
        const quote = await acrossClient.getQuote({
          route: {
            originChainId: 10, // Optimism
            destinationChainId: 8453, // Base
            inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC as `0x${string}`,
            outputToken: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
          },
          inputAmount: amountBigInt,
          recipient: MULTICALL_HANDLERS.BASE as `0x${string}`,
          crossChainMessage,
        });

        console.log("Received Across quote:", quote);

        // 3. Approve USDC spend
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          quote.deposit.inputAmount.toString()
        );

        console.log("USDC approval completed, proceeding with bridge");

        // 4. Execute bridge transaction with multicall message
        const bridgeResult = await handleBridgeTransaction(
          quote.deposit,
          SPOKE_POOL.OPTIMISM,
          multicallMessage // Pass the message to the bridge transaction
        );

        console.log("Bridge transaction completed:", bridgeResult);

        return bridgeResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Order submission error:", errorMessage);
        setError(errorMessage);
        setBridgeStep({
          ...bridgeStep,
          status: "failed",
        });
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [account, generateMessageForMulticallHandler, sendTransaction]
  );

  return {
    submitOrder,
    isLoading,
    error,
    bridgeStep,
  };
};
