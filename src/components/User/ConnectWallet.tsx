import { useLoginWithEmail, usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { base, polygon, optimism, arbitrum } from "viem/chains";

const ConnectWallet = () => {
  const { authenticated, user, logout, ready, login, linkWallet } = usePrivy();

  const { wallets, setActiveWallet } = useWallets();

  // Get the first/active wallet
  const activeWallet = wallets[0];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getDisplayIdentifier = (): string => {
    if (user?.email) {
      return typeof user.email === "object"
        ? user.email.toString()
        : user.email;
    }
    if (activeWallet?.address) {
      return truncateAddress(activeWallet.address.toString());
    }
    return "Connected User";
  };

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await login();
    } catch (err: any) {
      // Handle different types of errors
      if (err.message?.includes("Proposal expired")) {
        setError("Wallet connection timed out. Please try again.");
      } else {
        setError("Failed to connect. Please try again.");
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentChainName = (): string => {
    if (!activeWallet?.chainId) return "Not Connected";

    const chainMap = {
      [base.id]: "Base",
      [polygon.id]: "Polygon",
      [optimism.id]: "Optimism",
      [arbitrum.id]: "Arbitrum",
    };

    return chainMap[activeWallet.chainId] || "Unknown Chain";
  };

  if (!ready) {
    return <div className="animate-pulse">Loading authentication...</div>;
  }

  if (authenticated) {
    return (
      <div className="flex flex-col gap-4 items-center p-4 border rounded-lg shadow-sm">
        <div className="text-sm font-medium">
          Connected as: {getDisplayIdentifier()}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="text-xs text-gray-600">
            Current Network: {getCurrentChainName()}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {[base, polygon, optimism, arbitrum].map((chain) => (
              <button
                key={chain.id}
                onClick={async () => {
                  try {
                    if (activeWallet) {
                      await activeWallet.switchChain(chain.id);
                    }
                  } catch (error) {
                    setError(`Failed to switch to ${chain.name}`);
                  }
                }}
                disabled={activeWallet?.chainId === chain.id}
                className={`
        px-3 py-1 text-xs rounded-full
        ${
          activeWallet?.chainId === chain.id
            ? "bg-secondary text-white"
            : "bg-gray-100 hover:bg-gray-200"
        }
      `}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => linkWallet()}
            className="bg-secondary/80 text-font px-4 py-2 rounded-lg hover:bg-opacity-90"
          >
            Link Another Wallet
          </button>

          <button
            onClick={async () => {
              try {
                setIsLoading(true);
                await logout();
                setSuccessMessage("Successfully logged out");
              } catch (error) {
                setError("Failed to log out");
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className={`
              bg-secondary text-font px-4 py-2 rounded-lg
              transition-all duration-200
              ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-opacity-90"
              }
            `}
          >
            {isLoading ? "Signing Out..." : "SIGN OUT"}
          </button>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show single login button
  return (
    <div className="flex flex-col gap-4 items-center max-w-sm mx-auto p-6">
      {error && (
        <div className="w-full text-red-500 text-sm text-center bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="w-full text-green-500 text-sm text-center bg-green-50 p-2 rounded">
          {successMessage}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`
          w-full bg-secondary text-font px-4 py-2 rounded-lg 
          transition-all duration-200
          ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-90"}
        `}
      >
        {isLoading ? "Connecting..." : "Login with Email or Social"}
      </button>

      {error && (
        <button
          onClick={() => setError(null)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Helper function to truncate wallet addresses
const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default ConnectWallet;
