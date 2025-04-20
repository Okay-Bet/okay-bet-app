// src/components/types/privy.ts
export interface User {
  id: string;
  email?: string;
  wallet?: {
    address: string;
  };
}

export interface PrivyClientConfig {
  loginMethods: string[];
  appearance?: {
    theme?: "light" | "dark";
    accentColor?: string;
    logo?: string;
  };
  embeddedWallets?: {
    createOnLogin?: "all-users" | "none";
    noPromptOnSignature?: boolean;
  };
  defaultChain?: {
    id: number;
    name: string;
  };
}
