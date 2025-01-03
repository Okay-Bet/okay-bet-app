// src/hooks/order/useUSDCTransfer.ts
import { useSendTransaction } from 'thirdweb/react';
import { prepareUSDCTransfer, sleep } from '../../services/transaction';

export const useUSDCTransfer = () => {
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const sendUsdcTransfer = async (amount: string): Promise<{ transactionHash: string }> => {
    const transaction = prepareUSDCTransfer(amount);

    return new Promise((resolve, reject) => {
      sendTransaction(transaction, {
        onSuccess: async (result) => {
          try {
            console.log('USDC transfer sent, waiting for confirmation...');
            await sleep(15000); // Wait for confirmation
            console.log('Proceeding with order submission');
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        onError: (error) => {
          if (error instanceof Error && error.message.includes('transfer amount exceeds balance')) {
            reject(new Error('Insufficient USDC balance'));
            return;
          }
          reject(error);
        },
      });
    });
  };

  return { sendUsdcTransfer };
};