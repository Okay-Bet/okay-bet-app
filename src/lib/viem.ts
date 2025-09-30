import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Client,
  type HttpTransport,
  defineChain
} from 'viem';
import { base, polygon, optimism, arbitrum } from 'viem/chains';

// Define Polygon Amoy Testnet
export const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy Testnet',
  network: 'polygon-amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'POL',
    symbol: 'POL',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology']
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology']
    }
  },
  blockExplorers: {
    default: { 
      name: 'PolygonScan', 
      url: 'https://amoy.polygonscan.com' 
    }
  },
  testnet: true
});

export const chains = [base, polygon, optimism, arbitrum, polygonAmoy] as const;

// Specify the client type more precisely
export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC),
}) as PublicClient;

// Create public clients for each chain
export const publicClients = {
  base: createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient,
  polygon: createPublicClient({
    chain: polygon,
    transport: http(),
  }) as PublicClient,
  polygonAmoy: createPublicClient({
    chain: polygonAmoy,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC),
  }) as PublicClient,
  optimism: createPublicClient({
    chain: optimism,
    transport: http(),
  }) as PublicClient,
  arbitrum: createPublicClient({
    chain: arbitrum,
    transport: http(),
  }) as PublicClient,
};

export const createPrivyWalletClient = (provider: any, chainId?: number, address?: string): WalletClient | null => {
  if (!provider) return null;
  
  try {
    // Select chain based on chainId, default to polygonAmoy
    let chain = polygonAmoy; // default to Polygon Amoy
    if (chainId === 137) chain = polygon;
    else if (chainId === 80002) chain = polygonAmoy;
    else if (chainId === 8453) chain = base;
    else if (chainId === 10) chain = optimism;
    else if (chainId === 42161) chain = arbitrum;
    
    const client = createWalletClient({
      chain,
      transport: custom(provider),
      account: address as `0x${string}` | undefined
    });
    
    return client;
  } catch (error) {
    console.error('Failed to create wallet client:', error);
    return null;
  }
};