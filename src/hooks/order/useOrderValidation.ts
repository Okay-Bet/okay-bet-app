// src/hooks/order/useOrderValidation.ts
import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { OrderRequest } from '../../components/types/orders';
import { ValidationResponse } from '../../components/types/validation';
import { validateOrderRequest } from '../../services/validation';
import { toUSDCUnits } from './utils';

export const useOrderValidation = () => {
  const [validationStatus, setValidationStatus] = useState<ValidationResponse | null>(null);
  const account = useActiveAccount();

  const validateOrder = async (orderRequest: OrderRequest) => {
    try {
      if (!account) {
        throw new Error('Wallet not connected');
      }

      const orderData = {
        user_address: account.address,
        token_id: orderRequest.tokenId,
        price: orderRequest.price,
        amount: toUSDCUnits(orderRequest.amount),
        side: orderRequest.side,
        is_yes_token: orderRequest.isYesToken,
      };

      const validationData = await validateOrderRequest(orderData);
      setValidationStatus(validationData);
      return validationData;
    } catch (err) {
      console.error('Validation error:', err);
      throw err;
    }
  };

  return {
    validateOrder,
    validationStatus,
  };
};