// src/lib/viem.ts
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { base, polygon, optimism, arbitrum } from 'viem/chains';

export const chains = [base, polygon, optimism, arbitrum] as const;

// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
  chains,
});

// Function to create a wallet client from a provider (e.g. from Privy)
export const createPrivyWalletClient = (provider: any) => {
  if (!provider) return null;
  
  return createWalletClient({
    chain: base,
    transport: custom(provider),
    chains,
  });
};