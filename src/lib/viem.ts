import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Client,
  type HttpTransport
} from 'viem';
import { base, polygon, optimism, arbitrum } from 'viem/chains';

export const chains = [base, polygon, optimism, arbitrum] as const;

// Specify the client type more precisely
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
}) as PublicClient;

export const createPrivyWalletClient = (provider: any): WalletClient | null => {
  if (!provider) return null;
  
  try {
    return createWalletClient({
      chain: base,
      transport: custom(provider)
    });
  } catch (error) {
    console.error('Failed to create wallet client:', error);
    return null;
  }
};