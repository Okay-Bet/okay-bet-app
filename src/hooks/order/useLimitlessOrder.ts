import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../app/client";
import { optimism, base } from "thirdweb/chains";
import { ethers } from "ethers";
import { OrderRequest, AcrossQuote } from "../../components/types";
import {
  getAcrossClient,
  getAcrossQuote,
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

        // Create the multicall instruction with fallback
        const instructions = {
          calls: [
            {
              target: CONDITIONAL_TOKENS_ADDRESS,
              callData: approveCalldata,
              value: 0,
            },
            {
              target: marketAddress,
              callData: buyCalldata,
              value: 0,
            },
          ],
          fallbackRecipient: userAddress, // If any call fails, funds return to user
          revertOnFail: false, // Important: This ensures funds are returned on failure
        };

        // Encode the Instructions object for the multicall handler
        return abiCoder.encode(
          [
            "tuple(" +
              "tuple(address target, bytes callData, uint256 value)[] calls," +
              "address fallbackRecipient," +
              "bool revertOnFail" +
              ")",
          ],
          [instructions]
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

  // Add a dry run function to test market contract calls
  const dryRunMarketCalls = async (
    marketAddress: string,
    amount: bigint,
    outcomeIndex: number
  ) => {
    try {
      console.log("Starting dry run of market calls...");
      console.log("Market address:", marketAddress);

      // Get contract instances for dry run
      const conditionalTokensContract = getContract({
        client,
        chain: base,
        address: CONDITIONAL_TOKENS_ADDRESS as `0x${string}`,
        abi: CONDITIONAL_TOKENS_ABI,
      });

      console.log("Conditional tokens contract:", conditionalTokensContract);

      const marketContract = getContract({
        client,
        chain: base,
        address: marketAddress as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
      });

      console.log("Market contract:", marketContract);

      // Test conditional tokens approval
      const allowance = await conditionalTokensContract.read.allowance([
        account!.address,
        marketAddress,
      ]);
      console.log("Current allowance:", allowance.toString());

      // Test market buy calculation
      const buyAmount = await marketContract.read.calcBuyAmount([
        amount,
        outcomeIndex,
      ]);
      console.log("Calculated buy amount:", buyAmount.toString());

      // Test market balance/liquidity
      const marketBalance = await marketContract.read.getPoolBalance();
      console.log("Market liquidity:", marketBalance.toString());

      if (marketBalance < amount) {
        throw new Error("Insufficient market liquidity");
      }

      console.log("Dry run successful - market calls should succeed");
      return true;
    } catch (error) {
      console.error("Dry run failed:", error);
      throw new Error(`Market validation failed: ${error.message}`);
    }
  };

  const monitorBridgeAndRecover = async (bridgeResult: any) => {
    let bridgeComplete = false;
    while (!bridgeComplete) {
      const status = await checkBridgeStatus(bridgeResult.transactionHash);
      console.log("Bridge status:", status);

      if (status.status === "filled") {
        bridgeComplete = true;
        console.log("Bridge completed! Checking destination transaction...");

        // Check if the multicall succeeded
        const destinationTx = status.fillTx;
        if (destinationTx.status === 0) {
          // Failed transaction
          console.error("Multicall failed on destination chain");

          // Initiate automatic bridge back
          console.log("Starting automatic bridge back to Optimism...");

          // Get current USDC balance on Base
          const baseUSDC = getContract({
            client,
            chain: base,
            address: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
            abi: ["function balanceOf(address) view returns (uint256)"],
          });

          const baseBalance = await baseUSDC.read.balanceOf([account!.address]);

          if (baseBalance > BigInt(0)) {
            // Approve USDC for bridge back if needed
            const approvalTx = await handleTokenApproval(
              SUPPORTED_TOKENS.BASE.USDC,
              SPOKE_POOL.BASE,
              baseBalance.toString()
            );

            // Get bridge back quote
            const bridgeBackQuote = await acrossClient.getQuote({
              route: {
                originChainId: base.id,
                destinationChainId: optimism.id,
                inputToken: SUPPORTED_TOKENS.BASE.USDC as `0x${string}`,
                outputToken: SUPPORTED_TOKENS.OPTIMISM.USDC as `0x${string}`,
              },
              inputAmount: baseBalance,
              recipient: account!.address,
            });

            console.log("Bridge back quote received:", bridgeBackQuote);

            // Execute bridge back
            const bridgeBackResult = await handleBridgeTransaction(
              bridgeBackQuote.deposit,
              SPOKE_POOL.BASE,
              "0x" // No multicall message needed for bridge back
            );

            console.log("Bridge back initiated:", bridgeBackResult);
            throw new Error(
              "Market transaction failed - funds bridged back to Optimism"
            );
          }
        }
      } else {
        console.log("Bridge still in progress, waiting 30 seconds...");
        await sleep(30000);
      }
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
        const acrossClient = getAcrossClient();
        const amountBigInt = BigInt(orderRequest.amount);

        // 1. Perform dry run first
        await dryRunMarketCalls(
          orderRequest.tokenId,
          amountBigInt,
          orderRequest.isYesToken ? 1 : 0
        );

        // 2. Generate multicall instructions with fallback
        const multicallMessage = generateMessageForMulticallHandler(
          account.address,
          orderRequest.tokenId,
          amountBigInt,
          orderRequest.isYesToken ? 1 : 0
        );

        console.log("Generated multicall message:", multicallMessage);

        const crossChainMessage = {
          actions: [
            {
              target: MULTICALL_HANDLERS.BASE as `0x${string}`,
              callData: multicallMessage as `0x${string}`,
              value: BigInt(0),
            },
          ],
          fallbackRecipient: account.address as `0x${string}`,
          revertOnFail: false,
        };

        // 3. Get Across quote with the multicall message
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

        // 4. Approve USDC spend
        await handleTokenApproval(
          SUPPORTED_TOKENS.OPTIMISM.USDC,
          SPOKE_POOL.OPTIMISM,
          quote.deposit.inputAmount.toString()
        );

        console.log("USDC approval completed, proceeding with bridge");

        // 5. Execute bridge transaction with multicall message
        const bridgeResult = await handleBridgeTransaction(
          quote.deposit,
          SPOKE_POOL.OPTIMISM,
          multicallMessage // Pass the message to the bridge transaction
        );

        console.log("Bridge transaction completed:", bridgeResult);

        // Start monitoring with recovery
        monitorBridgeAndRecover(bridgeResult).catch((error) => {
          console.error("Bridge monitoring/recovery error:", error);
          setError(error.message);
        });

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
