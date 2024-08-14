"use client";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { base, defineChain } from "thirdweb/chains";
import { client } from "@/app/client";

const externalWallets = [
  createWallet("com.coinbase.wallet"),
];

const inAppWalletOption = inAppWallet({
  auth: {
    options: ["google", "facebook", "apple", "phone", "email"],
  },
  smartAccount: {
    chain: base,
    sponsorGas: true,
  },
});

const ConnectWallet = () => {
  return (
    <div className="justify-center mb-10 font-heading">
      <ConnectButton
        client={client}
        wallets={[...externalWallets, inAppWalletOption]}
        chain={defineChain(base)}
        theme={"dark"}
        connectModal={{ size: "wide" }}
        appMetadata={{
          name: "Okay Bet",
          url: "https://okaybet.fun",
        }}
        connectButton={{
          label: "SIGN IN",
          className: "bg-secondary text-font px-4 py-2 rounded-lg",
        }}
      />
    </div>
  );
};

export default ConnectWallet;