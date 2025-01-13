import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { OrderRequest } from "../../components/types";
import {
  getAcrossQuote,
  getTokenAddress,
  SUPPORTED_CHAINS,
  SPOKE_POOL,
  MULTICALL_HANDLERS,
  getAcrossClient,
  SUPPORTED_TOKENS,
} from "../../services/across/client";
import {
  prepareTokenApproval,
  prepareBridgeTransaction,
  generateBridgeDepositData,
} from "../../services/across/bridge";
import { sleep } from "../../services/transaction";

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
    spokePoolAddress: string
  ) => {
    console.log("Preparing bridge transaction with:", {
      deposit,
      spokePoolAddress,
    });

    try {
      // Generate deposit data
      const depositData = await generateBridgeDepositData(
        {
          depositor: account!.address,
          recipient: deposit.recipient,
          inputToken: deposit.inputToken,
          outputToken: deposit.outputToken,
          inputAmount: deposit.inputAmount,
          outputAmount: deposit.outputAmount,
          destinationChainId: deposit.destinationChainId,
          exclusiveRelayer: deposit.exclusiveRelayer,
          quoteTimestamp: deposit.quoteTimestamp,
          exclusivityPeriod: deposit.exclusivityDeadline,
          message: deposit.message || "0x",
        },
        spokePoolAddress
      );

      console.log("Generated deposit data:", depositData);

      // Prepare the bridge transaction
      const bridgeTx = prepareBridgeTransaction(
        spokePoolAddress,
        depositData,
        BigInt(0)
      );

      console.log("Bridge transaction prepared:", bridgeTx);

      // Actually send the transaction
      setBridgeStep({
        step: "bridging",
        status: "pending",
      });

      // Add validation logging before sending
      console.log("Validating bridge transaction parameters:", {
        to: bridgeTx.to,
        dataLength: bridgeTx.data.length,
        value: bridgeTx.value,
        chainId: bridgeTx.chain.id,
      });

      // Send the transaction and wait for response
      const txResponse = await sendTransaction({
        to: bridgeTx.to,
        data: bridgeTx.data,
        value: bridgeTx.value,
        chain: bridgeTx.chain,
      });

      console.log("Bridge transaction sent:", txResponse);

      setBridgeStep({
        step: "bridging",
        status: "pending",
        txHash: txResponse.hash,
      });

      // Wait for confirmation
      await sleep(15000);

      console.log("Bridge transaction confirmed");

      setBridgeStep({
        step: "bridging",
        status: "success",
        txHash: txResponse.hash,
      });

      return txResponse;
    } catch (error) {
      console.error("Bridge transaction failed:", error);
      setBridgeStep({
        step: "bridging",
        status: "failed",
      });
      throw error;
    }
  };

  const submitOrder = useCallback(
    async (orderRequest: OrderRequest) => {
      console.log("useLimitlessOrder: Received order request:", orderRequest);

      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Generate multicall instructions
        const amountBigInt = BigInt(orderRequest.amount);
        const message = generateMessageForMulticallHandler(
          account.address,
          orderRequest.tokenId,
          amountBigInt,
          orderRequest.isYesToken ? 1 : 0
        );

        console.log("Generated multicall message:", message);

        // 2. Get Across quote
        const quote = await getAcrossQuote({
          route: {
            originChainId: 10, // Optimism
            destinationChainId: 8453, // Base
            inputToken: SUPPORTED_TOKENS.OPTIMISM.USDC,
            outputToken: SUPPORTED_TOKENS.BASE.USDC,
          },
          inputAmount: amountBigInt,
          recipient: MULTICALL_HANDLERS.BASE,
          message,
        });

        console.log("Received Across quote:", quote);

        // 3. Approve USDC spend
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          quote.deposit.inputAmount.toString()
        );

        console.log("USDC approval completed, proceeding with bridge");

        // 4. Execute bridge transaction
        const bridgeResult = await handleBridgeTransaction(
          quote.deposit,
          SPOKE_POOL.OPTIMISM
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
