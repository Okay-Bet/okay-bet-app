// src/services/transaction.ts
import { getContract, prepareContractCall } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { client } from '@/app/client';

export const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const AGENT_WALLET_ADDRESS = '0x93c7c3f9394dEf62D2Ad0658c1c9b49919C13Ac5';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const prepareUSDCTransfer = (amount: string) => {
  const usdcContract = getContract({
    client,
    address: USDC_ADDRESS,
    chain: polygon,
  });

  return prepareContractCall({
    contract: usdcContract,
    method: 'function transfer(address to, uint256 amount)',
    params: [AGENT_WALLET_ADDRESS, BigInt(amount)],
  });
};

export const submitDelegatedOrder = async (orderData: any) => {
  const response = await fetch('/api/delegated-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.msg || errorData.detail || 'Failed to submit order');
  }

  return response.json();
};