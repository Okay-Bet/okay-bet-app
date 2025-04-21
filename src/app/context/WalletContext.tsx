// src/app/context/WalletContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { publicClient, createPrivyWalletClient } from "../../lib/viem";
import type { PublicClient, WalletClient } from "viem";

interface WalletContextType {
  isConnected: boolean;
  address?: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient | null;
  ready: boolean;
  authenticated: boolean;
  chainId?: number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const activeWallet = wallets[0];

  useEffect(() => {
    const setupWalletClient = async () => {
      if (activeWallet) {
        try {
          const provider = await activeWallet.getEthereumProvider();
          const client = createPrivyWalletClient(provider);
          setWalletClient(client);
        } catch (error) {
          console.error("Failed to setup wallet client:", error);
          setWalletClient(null);
        }
      }
    };

    setupWalletClient();
  }, [activeWallet]);

  const value = React.useMemo(
    () => ({
      isConnected: authenticated && !!activeWallet?.address,
      address: activeWallet?.address as `0x${string}` | undefined,
      publicClient,
      walletClient,
      ready,
      authenticated,
      chainId: activeWallet?.chainId,
    }),
    [
      authenticated,
      activeWallet?.address,
      walletClient,
      ready,
      activeWallet?.chainId,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
