"use client";
import React from "react";
import { InjectedConnector } from "starknetkit/injected";
import { ArgentMobileConnector } from "starknetkit/argentMobile";
import { WebWalletConnector } from "starknetkit/webwallet";
import { sepolia } from "@starknet-react/chains";
import { StarknetConfig, publicProvider } from "@starknet-react/core";

export default function StarknetProvider({ children }) {
  const chains = [sepolia]; // Since your contract is on Sepolia

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
      provider={publicProvider()}
      connectors={connectors}
      autoConnect={true}
    >
      {children}
    </StarknetConfig>
  );
}
