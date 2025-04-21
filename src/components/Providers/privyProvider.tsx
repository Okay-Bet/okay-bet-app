// src/components/Providers/privyProvider.tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistration from "../ServiceWorkerRegistration";
import { base, polygon, optimism, arbitrum } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        defaultChain: base,
        supportedChains: [base, polygon, optimism, arbitrum],
        solanaClusters: [
          {
            name: "mainnet-beta",
            rpcUrl: "https://api.mainnet-beta.solana.com",
          },
        ],
        appearance: {
            logo: '',
            landingHeader: 'Welcome to Okay Bet',
            loginMessage: "You are in!",
            theme: '#EEEEEE',

        },
      }}
    >
      <ServiceWorkerRegistration />
      {children}
      <Analytics />
    </PrivyProvider>
  );
}
