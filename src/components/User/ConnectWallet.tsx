"use client";
import { useLoginWithEmail, usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

const ConnectWallet = () => {
  const { authenticated, user, logout, ready } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper function to get display address/email with proper type handling
  const getDisplayIdentifier = (): string => {
    if (user?.email) {
      // Ensure we're converting the email to string if it's an object
      return typeof user.email === 'object' ? user.email.toString() : user.email;
    }
    if (user?.wallet?.address) {
      return truncateAddress(user.wallet.address.toString());
    }
    return 'Connected User';
  };

  if (!ready) {
    return <div className="animate-pulse">Loading authentication...</div>;
  }

  if (authenticated) {
    return (
      <div className="flex flex-col gap-2 items-center">
        <div className="text-sm font-medium">
          Connected as: {getDisplayIdentifier()}
        </div>
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
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}
          `}
        >
          {isLoading ? 'Signing Out...' : 'SIGN OUT'}
        </button>
      </div>
    );
  }

  const handleSendCode = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    try {
      await sendCode({ email });
      setShowCodeInput(true);
      setSuccessMessage("Verification code sent! Check your email.");
    } catch (error) {
      setError("Failed to send verification code. Please try again.");
      console.error("Error sending code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!code) {
      setError("Please enter the verification code");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await loginWithCode({ code });
      setSuccessMessage("Successfully logged in!");
    } catch (error) {
      setError("Invalid verification code. Please try again.");
      console.error("Error logging in:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => {
          setError(null);
          setEmail(e.target.value);
        }}
        disabled={isLoading || showCodeInput}
        className={`
          w-full px-4 py-2 rounded border
          focus:outline-none focus:ring-2 focus:ring-secondary
          ${isLoading || showCodeInput ? 'bg-gray-100' : 'bg-white'}
        `}
      />
      
      {!showCodeInput && (
        <button
          onClick={handleSendCode}
          disabled={isLoading || !email}
          className={`
            w-full bg-secondary text-font px-4 py-2 rounded-lg
            transition-all duration-200
            ${(isLoading || !email) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}
          `}
        >
          {isLoading ? 'Sending Code...' : 'Send Code'}
        </button>
      )}

      {showCodeInput && (
        <>
          <input
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => {
              setError(null);
              setCode(e.target.value);
            }}
            disabled={isLoading}
            className={`
              w-full px-4 py-2 rounded border
              focus:outline-none focus:ring-2 focus:ring-secondary
              ${isLoading ? 'bg-gray-100' : 'bg-white'}
            `}
          />
          <button
            onClick={handleLogin}
            disabled={isLoading || !code}
            className={`
              w-full bg-secondary text-font px-4 py-2 rounded-lg
              transition-all duration-200
              ${(isLoading || !code) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-90'}
            `}
          >
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </>
      )}
    </div>
  );
};

// Helper function to truncate wallet addresses
const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default ConnectWallet;