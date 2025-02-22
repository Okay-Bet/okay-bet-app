"use client";
import React from "react";
import { useAccount, useConnect } from "@starknet-react/core";

export default function ConnectButton() {
  const { connect, connectors } = useConnect();
  const { address } = useAccount();

  return (
    <div className="justify-center mb-10 font-heading">
      {!address ? (
        <div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="bg-secondary text-font px-4 py-2 rounded-lg"
            >
              Connect {connector.id}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-font">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
    </div>
  );
}
