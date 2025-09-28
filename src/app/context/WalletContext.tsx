// src/app/context/WalletContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { publicClient, createPrivyWalletClient } from "../../lib/viem";
import type { Client, PublicClient, WalletClient } from "viem";

interface WalletContextType {
  isConnected: boolean;
  address?: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient | null;
  ready: boolean;
  authenticated: boolean;
  chainId?: number;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

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
          const chainId = activeWallet.chainId ? Number(activeWallet.chainId) : undefined;
          const client = createPrivyWalletClient(provider, chainId);
          setWalletClient(client);
        } catch (error) {
          console.error("Failed to setup wallet client:", error);
          setWalletClient(null);
        }
      } else {
        setWalletClient(null);
      }
    };

    setupWalletClient();
  }, [activeWallet]);

  const value: WalletContextType = {
    isConnected: authenticated && !!activeWallet?.address,
    address: activeWallet?.address as `0x${string}` | undefined,
    publicClient: publicClient as PublicClient,
    walletClient,
    ready,
    authenticated,
    chainId: activeWallet?.chainId ? Number(activeWallet.chainId) : undefined, // Convert string to number
  };

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