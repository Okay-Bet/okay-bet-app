"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { baseSepolia, defineChain } from "thirdweb/chains";
import { client } from "@/app/client";

const wallets = [
  createWallet("com.coinbase.wallet"),
  inAppWallet({
    auth: {
      options: ["google", "facebook", "apple", "phone", "email"],
    },
  }),
];

const ConnectWallet = () => {
  return (
    <div className="flex justify-center mb-10 font-heading">
      <ConnectButton
        client={client}
        wallets={wallets}
        chain={defineChain(baseSepolia)}
        theme={"dark"}
        connectModal={{ size: "wide" }}
        appMetadata={{
          name: "Bets with Friends",
          url: "https://betswithfriends.fun",
        }}
        connectButton={{
          label: "CONNECT WALLET",
          className: "bg-secondary text-font px-4 py-2 rounded-lg",
        }}
      />
    </div>
  );
};

export default ConnectWallet;
