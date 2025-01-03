// services/validation.ts
import { OrderPayload, ValidationResponse } from '../components/types/orders';
import { isAddress } from 'ethers/lib/utils';

// Custom error for validation-specific issues
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Core validation function
export const validateOrderRequest = async (orderData: OrderPayload): Promise<ValidationResponse> => {
  // First, validate the Ethereum address format
  if (!isAddress(orderData.user_address)) {
    throw new ValidationError(`Invalid user address: ${orderData.user_address}`);
  }

  // Make the API call to validate the order
  const response = await fetch('/api/validate-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  // Handle API errors
  if (!response.ok) {
    throw new ValidationError(data.error?.msg || data.detail || 'Validation failed');
  }

  return data as ValidationResponse;
};