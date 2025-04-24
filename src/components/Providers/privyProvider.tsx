// src/components/Providers/privyProvider.tsx
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, polygon, optimism, arbitrum } from "viem/chains";
import { WalletProvider } from "../../app/context/WalletContext";

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
        // solanaClusters: [
        //   {
        //     name: "mainnet-beta",
        //     rpcUrl: "https://api.mainnet-beta.solana.com",
        //   },
        // ],
        appearance: {
          logo: "",
          landingHeader: "Welcome to Okay Bet",
          loginMessage: "Sign in or create an account",
          theme: "#EEEEEE",
          walletList: [
            "metamask",
            "rainbow",
            "phantom",
            "coinbase_wallet",
            "rabby_wallet",
            "detected_ethereum_wallets",
          ],
        },
      }}
    >
      <WalletProvider>
        {children}
      </WalletProvider>
    </PrivyProvider>
  );
}
