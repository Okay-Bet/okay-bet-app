"use client";
import React from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

export default function ConnectButton() {
  const { connect, connectors, status } = useConnect();
  const { address, account, status: accountStatus } = useAccount();
  const { disconnect } = useDisconnect();

  // Debug logging
  React.useEffect(() => {
    console.log("Connection status:", status);
    console.log("Account status:", accountStatus);
    console.log("Account details:", {
      address: address,
      hasAccount: !!account,
      // provider: account?.provider,
    });
  }, [status, accountStatus, address, account]);

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  return (
    <div className="justify-center mb-10 font-heading">
      {!address ? (
        <div className="flex gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={status === "pending"}
              className={`
                bg-secondary text-font px-4 py-2 rounded-lg
                ${
                  status === "pending"
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"
                }
              `}
            >
              {status === "pending"
                ? "Connecting..."
                : `Connect ${connector.id}`}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="text-black">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <button
            onClick={handleDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Status indicator */}
      <div className="text-sm mt-2 text-gray-600">
        Status: {status} | Account Status: {accountStatus}
      </div>
    </div>
  );
}
