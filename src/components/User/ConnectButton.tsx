"use client";
import React from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

export default function ConnectButton() {
  const { connect, connectors, status } = useConnect();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

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
    <div className="flex justify-center mb-10">
      {!address ? (
        <div className="flex gap-3">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={status === "pending"}
              className={`
                relative px-6 py-2.5 rounded-xl
                bg-gradient-to-r from-indigo-500 to-purple-600
                text-white font-medium text-sm
                shadow-lg shadow-indigo-500/30
                transition-all duration-200
                hover:shadow-indigo-500/50 hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100
              `}
            >
              {status === "pending" ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Connecting
                </span>
              ) : (
                `Connect ${connector.id}`
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-gray-800 text-gray-200 font-medium text-sm border border-gray-700">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <button
            onClick={handleDisconnect}
            className={`
              px-6 py-2.5 rounded-xl
              bg-gradient-to-r from-rose-500 to-pink-600
              text-white font-medium text-sm
              shadow-lg shadow-rose-500/30
              transition-all duration-200
              hover:shadow-rose-500/50 hover:scale-[1.02]
              active:scale-[0.98]
            `}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
