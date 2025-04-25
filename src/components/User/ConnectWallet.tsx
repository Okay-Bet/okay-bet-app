import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { base } from "viem/chains";

interface WalletType {
  address: string;
  chainId: number;
}

interface UserType {
  email: { address: string };
}

const ConnectWallet = () => {
  const { authenticated, user, logout, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0] as unknown as WalletType | undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDisplayIdentifier = (): string => {
    if (user?.email) {
      if (typeof user.email === "object" && "address" in user.email) {
        return user.email.address as string;
      }
      return String(user.email);
    }
    if (activeWallet?.address) {
      return truncateAddress(activeWallet.address);
    }
    return "Connected User";
  };

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await login();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(
        error.message?.includes("Proposal expired")
          ? "Connection timed out. Please try again."
          : "Failed to connect. Please try again."
      );
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-pulse-sharp text-accent-gray-400 font-body">
          Loading authentication...
        </div>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
        <div className="w-full flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-transparent transition-all duration-300 hover:shadow-sharp">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-body text-accent-gray-800 text-sm">
              {getDisplayIdentifier()}
            </span>
          </div>
          <button
            onClick={async () => {
              try {
                setIsLoading(true);
                await logout();
              } catch (error) {
                console.error("Logout error:", error);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className={`
              text-sm font-body px-3 py-1 rounded-lg
              bg-secondary text-white
              transition-all duration-200
              ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent-red-600"
              }
            `}
          >
            {isLoading ? "..." : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white/80 backdrop-blur-sm border border-transparent rounded-xl p-6 shadow-aggressive hover:shadow-sharp transition-all duration-300">
        {error && (
          <div className="mb-4 p-3 bg-accent-red-100 border border-accent-red-200 rounded-lg">
            <p className="text-accent-red-600 text-sm font-body text-center">
              {error}
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`
            w-full bg-secondary text-font px-6 py-4 rounded-lg 
            font-heading tracking-tighter italic
            transition-all duration-200 
            ${
              isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent-red-600 hover:shadow-sharp"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-font border-t-transparent" />
              Connecting...
            </span>
          ) : (
            "SIGN IN"
          )}
        </button>
      </div>
    </div>
  );
};

const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default ConnectWallet;
