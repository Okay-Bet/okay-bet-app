import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { prepareTokenApproval } from "../../../services/across/bridge";
import { sleep } from "../../../services/transaction";
import { BridgeStep } from "../../../components/types";

export const useTokenApproval = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>({
    step: "approval",
    status: "pending",
  });

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

      setBridgeStep({
        step: "approval",
        status: "pending",
        txHash: result.hash,
      });

      await sleep(15000);

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

  return {
    handleTokenApproval,
    bridgeStep,
  };
};