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

export const MULTICALL_HANDLERS = {
  OPTIMISM: "0x924a9f036260DdD5808007E1AA95f08eD08aA569",
  BASE: "0x924a9f036260DdD5808007E1AA95f08eD08aA569" 
} as const;

export const SPOKE_POOL = {
  OPTIMISM: "0x6f26Bf09B1C792e3228e5467807a900A503c0281",
  BASE: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64" 
} as const;

// Add @ts-ignore or type any for now since we're not using these interfaces
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
        integratorId: (process.env.NEXT_PUBLIC_ACROSS_INTEGRATOR_ID?.startsWith("0x") ? process.env.NEXT_PUBLIC_ACROSS_INTEGRATOR_ID : "0xdead") as `0x${string}`,
        chains: [SUPPORTED_CHAINS.OPTIMISM, SUPPORTED_CHAINS.BASE],
      });

      console.log("Across client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Across client:", error);
      throw error;
    }
  }
  return acrossClient;
};

// Method 1: Use type assertion
export const getAcrossQuote = async (params: QuoteParams) => {
  try {
    const client = getAcrossClient();
    
    console.log("Requesting Across quote with params:", {
      ...params,
      inputAmount: params.inputAmount.toString(), 
    });

    // Use type assertion to bypass type checking
    const quote = await client.getQuote(params as any);

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
