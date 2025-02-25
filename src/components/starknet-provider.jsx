"use client";
import React from "react";
import { InjectedConnector } from "starknetkit/injected";
import { ArgentMobileConnector } from "starknetkit/argentMobile";
import { WebWalletConnector } from "starknetkit/webwallet";
import { sepolia } from "@starknet-react/chains";
import { StarknetConfig, publicProvider } from "@starknet-react/core"
import { RpcProvider } from 'starknet';


export default function StarknetProvider({ children }) {
  const chains = [sepolia]; // Since your contract is on Sepolia

  // Create a custom provider factory
  const customProvider = () => {
    const rpcUrls = [
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
      "https://starknet-sepolia.public.blastapi.io",
      "https://sepolia.starknet.a5labs.com",
    ];

    // Return a provider factory function
    return ({chain}) => {
      return new RpcProvider({
        nodeUrl: rpcUrls[Math.floor(Math.random() * rpcUrls.length)], // Randomly select an RPC URL
        retries: 3,
        backoff: (retry) => Math.min(100 * (2 ** retry), 5000),
      });
    };
  };

  const connectors = [
    new InjectedConnector({
      options: {
        id: "braavos",
        name: "Braavos",
        showModal: true,
      },
    }),
    new InjectedConnector({
      options: {
        id: "argentX",
        name: "Argent X",
        showModal: true,
      },
    }),
    new WebWalletConnector({ url: "https://web.argent.xyz" }),
  ];

  return (
    <StarknetConfig
      chains={chains}
      provider={customProvider()}
      connectors={connectors}
      autoConnect={true}
    >
      {children}
    </StarknetConfig>
  );
}
