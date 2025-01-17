import { createAcrossClient } from "@across-protocol/app-sdk";
import { optimism, polygon, base } from "viem/chains";

// Define supported chains and tokens
export const SUPPORTED_CHAINS = {
  OPTIMISM: optimism,
  BASE: base,
  POLYGON: polygon,
} as const;

export const SUPPORTED_TOKENS = {
  OPTIMISM: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  BASE: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  POLYGON: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
} as const;

// Across multicall handler addresses
export const MULTICALL_HANDLERS = {
  OPTIMISM: "0x924a9f036260DdD5808007E1AA95f08eD08aA569",
  BASE: "0x924a9f036260DdD5808007E1AA95f08eD08aA569" 
} as const;

export const SPOKE_POOL = {
  OPTIMISM: "0x6f26Bf09B1C792e3228e5467807a900A503c0281",
  BASE: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64" 
} as const;

interface SuggestedFeesParams {
  originChainId: number;
  destinationChainId: number;
  originToken: string;
  destinationToken: string;
  amount: bigint;
  recipient: string;
  message: string;
  skipValidation?: boolean;
}

interface QuoteParams {
  route: {
    originChainId: number;
    destinationChainId: number;
    inputToken: string;
    outputToken: string;
  };
  inputAmount: bigint;
  recipient: string;
  message?: string;
}

let acrossClient: ReturnType<typeof createAcrossClient> | null = null;

export const getAcrossClient = () => {
  if (!acrossClient) {
    try {
      acrossClient = createAcrossClient({
        integratorId: process.env.NEXT_PUBLIC_ACROSS_INTEGRATOR_ID || "0xdead",
        chains: [SUPPORTED_CHAINS.OPTIMISM, SUPPORTED_CHAINS.BASE],
        // Add optional configuration
        config: {
          // Recommended timeout for API requests
          timeout: 10000,
          // Optional baseUrl override
          baseUrl: process.env.NEXT_PUBLIC_ACROSS_API_URL,
        }
      });

      console.log("Across client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Across client:", error);
      throw error;
    }
  }
  return acrossClient;
};

export const getAcrossQuote = async (params: QuoteParams) => {
  try {
    const client = getAcrossClient();
    
    console.log("Requesting Across quote with params:", {
      ...params,
      inputAmount: params.inputAmount.toString(), 
    });

    const quote = await client.getQuote({
      ...params
    });

    console.log("Received quote response:", quote);
    return quote;
  } catch (error) {
    console.error("Error getting Across quote:", error);
    throw error;
  }
};

export const formatInputAmount = (amount: string) => {
  try {
    // Convert to USDC decimals (6)
    return BigInt(amount);
  } catch (error) {
    console.error("Error formatting input amount:", error);
    throw new Error(`Invalid amount format: ${amount}`);
  }
};

// Utility function to validate chain support
export const validateChainSupport = (chainId: number): boolean => {
  const supportedChainIds = Object.values(SUPPORTED_CHAINS).map(chain => chain.id);
  return supportedChainIds.includes(chainId);
};

// Utility function to get token address
export const getTokenAddress = (chainId: number, symbol: string = 'USDC'): string => {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const chainName = Object.keys(SUPPORTED_CHAINS).find(
    key => SUPPORTED_CHAINS[key as keyof typeof SUPPORTED_CHAINS].id === chainId
  );

  if (!chainName) {
    throw new Error(`Cannot find chain name for ID: ${chainId}`);
  }

  const tokenAddress = SUPPORTED_TOKENS[chainName as keyof typeof SUPPORTED_TOKENS][symbol as keyof typeof SUPPORTED_TOKENS[keyof typeof SUPPORTED_TOKENS]];
  
  if (!tokenAddress) {
    throw new Error(`Token ${symbol} not supported on chain ${chainName}`);
  }

  return tokenAddress;
};