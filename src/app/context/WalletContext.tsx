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
          
          // Parse chainId properly (same logic as below)
          let chainId: number | undefined;
          const rawChainId = activeWallet.chainId;
          
          if (rawChainId) {
            if (typeof rawChainId === 'string') {
              // Handle CAIP-2 format like "eip155:80002"
              if (rawChainId.includes(':')) {
                const parts = rawChainId.split(':');
                chainId = parseInt(parts[1], 10);
              }
              // Handle hex string like "0x13882"
              else if (rawChainId.startsWith('0x')) {
                chainId = parseInt(rawChainId, 16);
              }
              // Handle regular string number
              else {
                chainId = parseInt(rawChainId, 10);
              }
            } else {
              chainId = Number(rawChainId);
            }
          }
          
          const client = createPrivyWalletClient(provider, chainId, activeWallet.address);
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

  // Parse chainId - it might come as hex string, number, or CAIP-2 format
  let parsedChainId: number | undefined;
  
  if (activeWallet) {
    // Check different possible chainId locations
    const rawChainId = activeWallet.chainId || 
                       activeWallet.chain?.id ||
                       walletClient?.chain?.id;
    
    if (rawChainId !== undefined && rawChainId !== null) {
      if (typeof rawChainId === 'string') {
        // Handle CAIP-2 format like "eip155:80002"
        if (rawChainId.includes(':')) {
          const parts = rawChainId.split(':');
          parsedChainId = parseInt(parts[1], 10);
        }
        // Handle hex string like "0x13882"
        else if (rawChainId.startsWith('0x')) {
          parsedChainId = parseInt(rawChainId, 16);
        }
        // Handle regular string number
        else {
          parsedChainId = parseInt(rawChainId, 10);
        }
      } else {
        parsedChainId = Number(rawChainId);
      }
    }
  }

  const value: WalletContextType = {
    isConnected: authenticated && !!activeWallet?.address,
    address: activeWallet?.address as `0x${string}` | undefined,
    publicClient: publicClient as PublicClient,
    walletClient,
    ready,
    authenticated,
    chainId: parsedChainId,
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