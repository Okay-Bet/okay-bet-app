type QueryType = "walletAddress" | "email" | "phone";

interface FetchWalletMetadataProps {
  queryBy: QueryType;
  value: string;
}

interface WalletMetadata {
  userId: string;
  walletAddress: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export async function fetchWalletMetadata({
  queryBy,
  value,
}: FetchWalletMetadataProps): Promise<WalletMetadata[]> {
  try {
    const response = await fetch("/api/fetch-wallet-metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ queryBy, value }),
    });

    if (!response.ok) {
      console.error("Response status:", response.status);
      console.error("Response statusText:", response.statusText);
      const text = await response.text();
      console.error("Response body:", text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
