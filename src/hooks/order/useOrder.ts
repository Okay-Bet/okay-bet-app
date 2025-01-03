// src/hooks/order/useOrder.ts
import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { OrderStatus, OrderRequest } from '../../types/order';
import { useOrderValidation } from './useOrderValidation';
import { useUSDCTransfer } from './useUSDCTransfer';
import { submitDelegatedOrder } from '../../services/transaction';

export const useOrder = () => {
  const [status, setStatus] = useState<OrderStatus>({ state: 'idle' });
  const account = useActiveAccount();
  const { validateOrder } = useOrderValidation();
  const { sendUsdcTransfer } = useUSDCTransfer();

  const submitOrder = async (orderRequest: OrderRequest) => {
    try {
      // Step 1: Validate Order
      setStatus({ state: 'validating' });
      const validationData = await validateOrder(orderRequest);
      
      if (!validationData.valid) {
        throw new Error('Order validation failed');
      }

      setStatus({ state: 'validated', data: validationData });

      // Step 2: Send USDC Transfer
      setStatus({ state: 'preparing_transfer' });
      const orderAmount = validationData.estimated_total.toString();
      
      setStatus({ state: 'awaiting_signature' });
      const txResult = await sendUsdcTransfer(orderAmount);
      
      setStatus({ state: 'confirming_transfer', txHash: txResult.transactionHash });

      // Step 3: Submit Delegated Order
      setStatus({ state: 'submitting_order' });
      const orderData = {
        user_address: account?.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price,
        amount: orderAmount,
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken,
        usdc_transaction_hash: txResult.transactionHash,
      };

      const result = await submitDelegatedOrder(orderData);
      
      setStatus({ state: 'complete', result });
      return result;
    } catch (err) {
      console.error('Order error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setStatus({ state: 'error', error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    submitOrder,
    status,
    isLoading: ['validating', 'preparing_transfer', 'awaiting_signature', 'confirming_transfer', 'submitting_order'].includes(status.state),
  };
};