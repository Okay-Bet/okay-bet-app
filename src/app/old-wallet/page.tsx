// app/old-wallet/page.tsx
"use client";

import React from "react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { base, defineChain } from "thirdweb/chains";
import { client } from "@/app/client";
import Link from "next/link";

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "facebook", "apple", "phone", "email"],
    },
    }),
];

const OldWalletPage: React.FC = () => {
  return (
    <main className="min-h-screen width-full flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Access Your Old Wallet</h1>
      
      <p className="text-lg mb-8 text-center">
        This page allows you to connect to your old in-app wallet. Use this to access and transfer any funds from your previous wallet that haven't been migrated to the new account abstraction system. The new system pays for all your gas. 
      </p>

      <div className="mb-8">
        <ConnectButton
          client={client}
          wallets={wallets}
          chain={defineChain(base)}
          theme="dark"
          connectModal={{ size: "wide" }}
          appMetadata={{
            name: "Okay Bet - Old Wallet",
            url: "https://okaybet.fun/old-wallet",
          }}
          connectButton={{
            label: "CONNECT WALLET",
            className: "bg-secondary text-font px-6 py-3 rounded-lg text-lg",
          }}
        />
      </div>

      <p className="text-sm text-gray-500 mb-4">
        After connecting, you'll be able to view and transfer your old wallet balance or export your private key.
      </p>

      <Link href="/" className="text-blue-500 hover:underline">
        Return to main page
      </Link>
    </main>
  );
};

export default OldWalletPage;