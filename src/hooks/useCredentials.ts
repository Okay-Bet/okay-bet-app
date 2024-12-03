import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";

interface Credentials {
  api_key: string;
  api_secret: string;
  api_passphrase: string;
}

export const useCredentials = () => {
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const getCredentials = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!account) {
        throw new Error("Wallet not connected");
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = 0;

      // Convert message to UTF-8 encoded string
      const messageToSign = new TextEncoder()
        .encode(`This message attests that I control the given wallet`)
        .toString();

      // Add some debug logging
      console.log("Account:", account);
      console.log("Message to sign:", messageToSign);

      // Use the account's built-in signMessage method
      const signature = await account.signMessage({
        message: messageToSign,
      });

      console.log("Signature:", signature);

      const response = await fetch("/api/polymarket-credentials", {
        method: "POST",
        headers: {
          POLY_ADDRESS: account.address,
          POLY_SIGNATURE: signature,
          POLY_TIMESTAMP: timestamp,
          POLY_NONCE: nonce.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setCredentials(data.credentials);
      return data.credentials;
    } catch (err) {
      console.error("Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    getCredentials,
    loading,
    error,
    credentials,
  };
};
